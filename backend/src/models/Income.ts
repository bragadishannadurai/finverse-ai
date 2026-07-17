import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IIncome extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  title: string;
  description?: string;
  source: 'salary' | 'freelance' | 'business' | 'investment' | 'rental' | 'gift' | 'other';
  date: Date;
  isRecurring: boolean;
  recurringInterval?: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  taxable: boolean;
  taxRate?: number;
  notes?: string;
  bankAccount?: mongoose.Types.ObjectId;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const IncomeSchema = new Schema<IIncome>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'INR' },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    source: {
      type: String,
      enum: ['salary', 'freelance', 'business', 'investment', 'rental', 'gift', 'other'],
      default: 'other',
    },
    date: { type: Date, required: true, default: Date.now },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'],
    },
    taxable: { type: Boolean, default: true },
    taxRate: { type: Number, min: 0, max: 100 },
    notes: { type: String, maxlength: 1000 },
    bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true }
);

IncomeSchema.index({ user: 1, date: -1 });
IncomeSchema.index({ user: 1, source: 1 });
IncomeSchema.index({ user: 1, isRecurring: 1 });

const Income: Model<IIncome> = mongoose.model<IIncome>('Income', IncomeSchema);
export default Income;
