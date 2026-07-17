import mongoose, { Document, Model } from 'mongoose';
export interface IReport extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    type: 'weekly' | 'monthly' | 'yearly' | 'custom';
    format: 'pdf' | 'excel' | 'csv' | 'json';
    title: string;
    period: {
        start: Date;
        end: Date;
    };
    status: 'pending' | 'processing' | 'completed' | 'failed';
    fileUrl?: string;
    fileSize?: number;
    data?: Record<string, unknown>;
    error?: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Report: Model<IReport>;
export default Report;
//# sourceMappingURL=Report.d.ts.map