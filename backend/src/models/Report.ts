import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'weekly' | 'monthly' | 'yearly' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  title: string;
  period: { start: Date; end: Date };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  data?: Record<string, unknown>;
  error?: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['weekly', 'monthly', 'yearly', 'custom'], required: true },
    format: { type: String, enum: ['pdf', 'excel', 'csv', 'json'], required: true },
    title: { type: String, required: true, trim: true },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    fileUrl: { type: String },
    fileSize: { type: Number },
    data: { type: Schema.Types.Mixed },
    error: { type: String },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

ReportSchema.index({ user: 1, createdAt: -1 });
ReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Report: Model<IReport> = mongoose.model<IReport>('Report', ReportSchema);
export default Report;
