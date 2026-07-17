import mongoose, { Document, Model } from 'mongoose';
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
declare const BankAccount: Model<IBankAccount>;
export default BankAccount;
//# sourceMappingURL=BankAccount.d.ts.map