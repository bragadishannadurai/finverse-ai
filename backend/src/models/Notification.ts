import mongoose, { Document, Schema, Model } from 'mongoose';

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

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['budget_alert', 'savings_milestone', 'bill_due', 'ai_suggestion', 'system', 'report_ready', 'investment_alert'],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    icon: { type: String },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    metadata: { type: Schema.Types.Mixed },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, isRead: 1 });
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;
