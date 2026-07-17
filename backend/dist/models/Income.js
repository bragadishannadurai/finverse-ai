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
const IncomeSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Category', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'INR' },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    source: {
        type: String,
        enum: ['salary', 'freelance', 'business', 'investment', 'rental', 'gift', 'other'],
        default: 'other',
    },
    date: { type: Date, required: true, default: Date.now },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
        type: String,
        enum: ['weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly'],
    },
    taxable: { type: Boolean, default: true },
    taxRate: { type: Number, min: 0, max: 100 },
    notes: { type: String, maxlength: 1000 },
    bankAccount: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BankAccount' },
    tags: [{ type: String, trim: true, lowercase: true }],
}, { timestamps: true });
IncomeSchema.index({ user: 1, date: -1 });
IncomeSchema.index({ user: 1, source: 1 });
IncomeSchema.index({ user: 1, isRecurring: 1 });
const Income = mongoose_1.default.model('Income', IncomeSchema);
exports.default = Income;
//# sourceMappingURL=Income.js.map