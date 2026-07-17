import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  title: string;
  description?: string;
  merchant?: string;
  date: Date;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  tags: string[];
  receipt?: string;
  receiptPublicId?: string;
  isRecurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurringEndDate?: Date;
  location?: {
    name: string;
    lat?: number;
    lng?: number;
  };
  notes?: string;
  bankAccount?: mongoose.Types.ObjectId;
  isVerified: boolean;
  ocrData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: { type: Number, required: [true, 'Amount is required'], min: [0.01, 'Amount must be positive'] },
    currency: { type: String, default: 'INR' },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    merchant: { type: String, trim: true, maxlength: 100 },
    date: { type: Date, required: [true, 'Date is required'], default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'],
      default: 'cash',
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    receipt: { type: String },
    receiptPublicId: { type: String },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
    },
    recurringEndDate: { type: Date },
    location: {
      name: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },
    notes: { type: String, maxlength: 1000 },
    bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    isVerified: { type: Boolean, default: false },
    ocrData: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ExpenseSchema.index({ user: 1, date: -1 });
ExpenseSchema.index({ user: 1, category: 1 });
ExpenseSchema.index({ user: 1, date: -1, category: 1 });
ExpenseSchema.index({ user: 1, isRecurring: 1 });
ExpenseSchema.index({ tags: 1 });
ExpenseSchema.index({ 'location.name': 'text', title: 'text', merchant: 'text' });

const Expense: Model<IExpense> = mongoose.model<IExpense>('Expense', ExpenseSchema);
export default Expense;
