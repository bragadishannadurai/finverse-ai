import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBudget extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  spent: number;
  currency: string;
  period: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  alertAt: number; // percentage (e.g. 80 = alert at 80%)
  isAlertSent: boolean;
  rollover: boolean;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetSchema = new Schema<IBudget>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01 },
    spent: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    alertAt: { type: Number, default: 80, min: 1, max: 100 },
    isAlertSent: { type: Boolean, default: false },
    rollover: { type: Boolean, default: false },
    notes: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BudgetSchema.virtual('percentage').get(function () {
  return this.amount > 0 ? Math.round((this.spent / this.amount) * 100) : 0;
});

BudgetSchema.virtual('remaining').get(function () {
  return Math.max(0, this.amount - this.spent);
});

BudgetSchema.set('toJSON', { virtuals: true });
BudgetSchema.index({ user: 1, period: 1 });
BudgetSchema.index({ user: 1, startDate: 1, endDate: 1 });

const Budget: Model<IBudget> = mongoose.model<IBudget>('Budget', BudgetSchema);
export default Budget;
