"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const SettingsSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
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
}, { timestamps: true });
const Settings = mongoose_1.default.model('Settings', SettingsSchema);
exports.default = Settings;
//# sourceMappingURL=Settings.js.map