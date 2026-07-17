import mongoose, { Document, Model } from 'mongoose';
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
    alertAt: number;
    isAlertSent: boolean;
    rollover: boolean;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const Budget: Model<IBudget>;
export default Budget;
//# sourceMappingURL=Budget.d.ts.map