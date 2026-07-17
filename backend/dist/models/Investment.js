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
const InvestmentSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    type: {
        type: String,
        enum: ['stock', 'mutual_fund', 'sip', 'gold', 'crypto', 'fixed_deposit', 'real_estate', 'bonds', 'other'],
        required: true,
    },
    symbol: { type: String, trim: true, uppercase: true },
    units: { type: Number, default: 0, min: 0 },
    buyPrice: { type: Number, required: true, min: 0 },
    currentPrice: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    investedAmount: { type: Number, required: true, min: 0 },
    currentValue: { type: Number, default: 0, min: 0 },
    returns: { type: Number, default: 0 },
    returnsPercentage: { type: Number, default: 0 },
    startDate: { type: Date, required: true, default: Date.now },
    maturityDate: { type: Date },
    platform: { type: String, trim: true, maxlength: 100 },
    accountNumber: { type: String, trim: true },
    interestRate: { type: Number, min: 0, max: 100 },
    dividends: { type: Number, default: 0, min: 0 },
    isSIP: { type: Boolean, default: false },
    sipAmount: { type: Number, min: 0 },
    sipDate: { type: Number, min: 1, max: 31 },
    notes: { type: String, maxlength: 1000 },
    isActive: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now },
    // Auto-pay
    autoPay: { type: Boolean, default: false },
    autoPayAmount: { type: Number, min: 0 },
    autoPayInterval: { type: String, enum: ['weekly', 'monthly'] },
    autoPayBankAccount: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BankAccount' },
    lastPaidAt: { type: Date },
    nextPayDate: { type: Date },
}, { timestamps: true });
InvestmentSchema.pre('validate', function () {
    if (this.units && this.buyPrice) {
        this.investedAmount = this.units * this.buyPrice;
    }
    if (this.units && this.currentPrice) {
        this.currentValue = this.units * this.currentPrice;
    }
    else if (this.units && this.buyPrice && !this.currentPrice) {
        this.currentPrice = this.buyPrice;
        this.currentValue = this.units * this.buyPrice;
    }
});
InvestmentSchema.pre('save', function () {
    if (this.isModified('currentValue') || this.isModified('investedAmount')) {
        this.returns = this.currentValue - this.investedAmount;
        this.returnsPercentage =
            this.investedAmount > 0
                ? parseFloat(((this.returns / this.investedAmount) * 100).toFixed(2))
                : 0;
    }
});
InvestmentSchema.index({ user: 1, type: 1 });
InvestmentSchema.index({ user: 1, isActive: 1 });
const Investment = mongoose_1.default.model('Investment', InvestmentSchema);
exports.default = Investment;
//# sourceMappingURL=Investment.js.map