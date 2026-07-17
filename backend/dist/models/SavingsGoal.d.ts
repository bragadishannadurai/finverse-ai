import mongoose, { Document, Model } from 'mongoose';
export interface ISavingsGoal extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    name: string;
    targetAmount: number;
    currentAmount: number;
    currency: string;
    targetDate: Date;
    icon: string;
    color: string;
    category: 'emergency' | 'travel' | 'home' | 'education' | 'vehicle' | 'retirement' | 'other';
    priority: 'low' | 'medium' | 'high';
    autoSave: boolean;
    autoSaveAmount?: number;
    autoSaveInterval?: 'daily' | 'weekly' | 'monthly';
    autoSaveBankAccount?: mongoose.Types.ObjectId;
    lastPaidAt?: Date;
    nextPayDate?: Date;
    milestones: Array<{
        percentage: number;
        label: string;
        reached: boolean;
        reachedAt?: Date;
    }>;
    notes?: string;
    isCompleted: boolean;
    completedAt?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const SavingsGoal: Model<ISavingsGoal>;
export default SavingsGoal;
//# sourceMappingURL=SavingsGoal.d.ts.map