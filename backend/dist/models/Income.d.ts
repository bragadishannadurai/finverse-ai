import mongoose, { Document, Model } from 'mongoose';
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
declare const Income: Model<IIncome>;
export default Income;
//# sourceMappingURL=Income.d.ts.map