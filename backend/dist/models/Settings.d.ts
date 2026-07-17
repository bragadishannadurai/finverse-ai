import mongoose, { Document, Model } from 'mongoose';
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
declare const Settings: Model<ISettings>;
export default Settings;
//# sourceMappingURL=Settings.d.ts.map