import mongoose, { Document, Model } from 'mongoose';
export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    type: 'budget_alert' | 'savings_milestone' | 'bill_due' | 'ai_suggestion' | 'system' | 'report_ready' | 'investment_alert';
    title: string;
    message: string;
    icon?: string;
    link?: string;
    isRead: boolean;
    isArchived: boolean;
    priority: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Notification: Model<INotification>;
export default Notification;
//# sourceMappingURL=Notification.d.ts.map