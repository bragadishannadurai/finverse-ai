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
const SavingsGoalSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    autoSaveBankAccount: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BankAccount' },
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
}, { timestamps: true });
SavingsGoalSchema.virtual('progress').get(function () {
    return this.targetAmount > 0
        ? Math.min(100, Math.round((this.currentAmount / this.targetAmount) * 100))
        : 0;
});
SavingsGoalSchema.set('toJSON', { virtuals: true });
SavingsGoalSchema.index({ user: 1, isCompleted: 1 });
SavingsGoalSchema.index({ user: 1, targetDate: 1 });
const SavingsGoal = mongoose_1.default.model('SavingsGoal', SavingsGoalSchema);
exports.default = SavingsGoal;
//# sourceMappingURL=SavingsGoal.js.map