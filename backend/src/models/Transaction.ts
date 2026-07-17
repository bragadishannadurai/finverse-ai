import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITransaction extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'debit' | 'credit' | 'transfer';
  amount: number;
  currency: string;
  description: string;
  category?: mongoose.Types.ObjectId;
  bankAccount?: mongoose.Types.ObjectId;
  referenceId?: string;
  expenseId?: mongoose.Types.ObjectId;
  incomeId?: mongoose.Types.ObjectId;
  date: Date;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  merchant?: string;
  balance?: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['debit', 'credit', 'transfer'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
    bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    referenceId: { type: String, trim: true },
    expenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
    incomeId: { type: Schema.Types.ObjectId, ref: 'Income' },
    date: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'completed' },
    paymentMethod: { type: String, default: 'other' },
    merchant: { type: String, trim: true },
    balance: { type: Number },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, type: 1 });
TransactionSchema.index({ user: 1, status: 1 });

const Transaction: Model<ITransaction> = mongoose.model<ITransaction>('Transaction', TransactionSchema);
export default Transaction;
