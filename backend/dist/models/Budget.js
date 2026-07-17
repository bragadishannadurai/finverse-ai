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
const BudgetSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Category', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0.01 },
    spent: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    period: {
        type: String,
        enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
        default: 'monthly',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    alertAt: { type: Number, default: 80, min: 1, max: 100 },
    isAlertSent: { type: Boolean, default: false },
    rollover: { type: Boolean, default: false },
    notes: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
BudgetSchema.virtual('percentage').get(function () {
    return this.amount > 0 ? Math.round((this.spent / this.amount) * 100) : 0;
});
BudgetSchema.virtual('remaining').get(function () {
    return Math.max(0, this.amount - this.spent);
});
BudgetSchema.set('toJSON', { virtuals: true });
BudgetSchema.index({ user: 1, period: 1 });
BudgetSchema.index({ user: 1, startDate: 1, endDate: 1 });
const Budget = mongoose_1.default.model('Budget', BudgetSchema);
exports.default = Budget;
//# sourceMappingURL=Budget.js.map