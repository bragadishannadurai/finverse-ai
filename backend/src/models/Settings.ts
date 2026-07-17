import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISettings extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  notifications: {
    email: boolean;
    push: boolean;
    budgetAlerts: boolean;
    savingsMilestones: boolean;
    billDue: boolean;
    weeklyReport: boolean;
    monthlyReport: boolean;
    aiInsights: boolean;
  };
  privacy: {
    showBalance: boolean;
    showTransactions: boolean;
    allowAnalytics: boolean;
  };
  appearance: {
    theme: 'dark' | 'light' | 'system';
    accentColor: string;
    compactMode: boolean;
    animationsEnabled: boolean;
  };
  financial: {
    currency: string;
    currencySymbol: string;
    fiscalYearStart: number;
    roundAmounts: boolean;
    showCents: boolean;
  };
  ai: {
    enabled: boolean;
    autoAnalysis: boolean;
    suggestions: boolean;
    model: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      budgetAlerts: { type: Boolean, default: true },
      savingsMilestones: { type: Boolean, default: true },
      billDue: { type: Boolean, default: true },
      weeklyReport: { type: Boolean, default: false },
      monthlyReport: { type: Boolean, default: true },
      aiInsights: { type: Boolean, default: true },
    },
    privacy: {
      showBalance: { type: Boolean, default: true },
      showTransactions: { type: Boolean, default: true },
      allowAnalytics: { type: Boolean, default: true },
    },
    appearance: {
      theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
      accentColor: { type: String, default: '#00E5FF' },
      compactMode: { type: Boolean, default: false },
      animationsEnabled: { type: Boolean, default: true },
    },
    financial: {
      currency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
      fiscalYearStart: { type: Number, default: 4, min: 1, max: 12 },
      roundAmounts: { type: Boolean, default: false },
      showCents: { type: Boolean, default: true },
    },
    ai: {
      enabled: { type: Boolean, default: true },
      autoAnalysis: { type: Boolean, default: true },
      suggestions: { type: Boolean, default: true },
      model: { type: String, default: 'gpt-4o-mini' },
    },
  },
  { timestamps: true }
);

const Settings: Model<ISettings> = mongoose.model<ISettings>('Settings', SettingsSchema);
export default Settings;
