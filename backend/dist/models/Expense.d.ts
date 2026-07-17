import mongoose, { Document, Model } from 'mongoose';
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
declare const Expense: Model<IExpense>;
export default Expense;
//# sourceMappingURL=Expense.d.ts.map