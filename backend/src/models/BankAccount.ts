import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBankAccount extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  bankName: string;
  accountNumber: string;
  accountType: 'savings' | 'current' | 'salary' | 'fixed_deposit' | 'recurring_deposit';
  balance: number;
  currency: string;
  ifscCode?: string;
  branchName?: string;
  isDefault: boolean;
  color: string;
  icon: string;
  isActive: boolean;
  lastSynced?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BankAccountSchema = new Schema<IBankAccount>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bankName: { type: String, required: true, trim: true, maxlength: 100 },
    accountNumber: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ['savings', 'current', 'salary', 'fixed_deposit', 'recurring_deposit'],
      default: 'savings',
    },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    ifscCode: { type: String, trim: true, uppercase: true },
    branchName: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
    color: { type: String, default: '#00E5FF' },
    icon: { type: String, default: '🏦' },
    isActive: { type: Boolean, default: true },
    lastSynced: { type: Date },
  },
  { timestamps: true }
);

BankAccountSchema.index({ user: 1 });

const BankAccount: Model<IBankAccount> = mongoose.model<IBankAccount>('BankAccount', BankAccountSchema);
export default BankAccount;
