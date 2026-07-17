import mongoose, { Document, Model } from 'mongoose';
export interface IActivityLog extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    action: string;
    resource: string;
    resourceId?: mongoose.Types.ObjectId;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
    errorMessage?: string;
    createdAt: Date;
}
declare const ActivityLog: Model<IActivityLog>;
export default ActivityLog;
//# sourceMappingURL=ActivityLog.d.ts.map