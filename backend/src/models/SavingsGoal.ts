import mongoose, { Document, Schema, Model } from 'mongoose';

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

const SavingsGoalSchema = new Schema<ISavingsGoal>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    targetAmount: { type: Number, required: true, min: 1 },
    currentAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    targetDate: { type: Date, required: true },
    icon: { type: String, default: '🎯' },
    color: { type: String, default: '#00E5FF' },
    category: {
      type: String,
      enum: ['emergency', 'travel', 'home', 'education', 'vehicle', 'retirement', 'other'],
      default: 'other',
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    autoSave: { type: Boolean, default: false },
    autoSaveAmount: { type: Number, min: 0 },
    autoSaveInterval: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    autoSaveBankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    lastPaidAt: { type: Date },
    nextPayDate: { type: Date },
    milestones: [
      {
        percentage: { type: Number, required: true },
        label: { type: String, required: true },
        reached: { type: Boolean, default: false },
        reachedAt: { type: Date },
      },
    ],
    notes: { type: String, maxlength: 1000 },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SavingsGoalSchema.virtual('progress').get(function () {
  return this.targetAmount > 0
    ? Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100))
    : 0;
});

SavingsGoalSchema.set('toJSON', { virtuals: true });
SavingsGoalSchema.index({ user: 1, isCompleted: 1 });
SavingsGoalSchema.index({ user: 1, targetDate: 1 });

const SavingsGoal: Model<ISavingsGoal> = mongoose.model<ISavingsGoal>('SavingsGoal', SavingsGoalSchema);
export default SavingsGoal;
