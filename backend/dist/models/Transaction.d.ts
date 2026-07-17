import mongoose, { Document, Model } from 'mongoose';
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
declare const Transaction: Model<ITransaction>;
export default Transaction;
//# sourceMappingURL=Transaction.d.ts.map