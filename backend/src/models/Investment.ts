import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IInvestment extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  name: string;
  type: 'stock' | 'mutual_fund' | 'sip' | 'gold' | 'crypto' | 'fixed_deposit' | 'real_estate' | 'bonds' | 'other';
  symbol?: string;
  units: number;
  buyPrice: number;
  currentPrice: number;
  currency: string;
  investedAmount: number;
  currentValue: number;
  returns: number;
  returnsPercentage: number;
  startDate: Date;
  maturityDate?: Date;
  platform?: string;
  accountNumber?: string;
  interestRate?: number;
  dividends: number;
  isSIP: boolean;
  sipAmount?: number;
  sipDate?: number;
  notes?: string;
  isActive: boolean;
  lastUpdated: Date;
  // Auto-pay fields
  autoPay: boolean;
  autoPayAmount?: number;
  autoPayInterval?: 'weekly' | 'monthly';
  autoPayBankAccount?: mongoose.Types.ObjectId;
  lastPaidAt?: Date;
  nextPayDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentSchema = new Schema<IInvestment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
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
    autoPayBankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    lastPaidAt: { type: Date },
    nextPayDate: { type: Date },
  },
  { timestamps: true }
);

InvestmentSchema.pre('validate', function () {
  if (this.units && this.buyPrice) {
    this.investedAmount = this.units * this.buyPrice;
  }
  if (this.units && this.currentPrice) {
    this.currentValue = this.units * this.currentPrice;
  } else if (this.units && this.buyPrice && !this.currentPrice) {
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

const Investment: Model<IInvestment> = mongoose.model<IInvestment>('Investment', InvestmentSchema);
export default Investment;
