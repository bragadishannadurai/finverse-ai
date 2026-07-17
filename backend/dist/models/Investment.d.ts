import mongoose, { Document, Model } from 'mongoose';
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
    autoPay: boolean;
    autoPayAmount?: number;
    autoPayInterval?: 'weekly' | 'monthly';
    autoPayBankAccount?: mongoose.Types.ObjectId;
    lastPaidAt?: Date;
    nextPayDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Investment: Model<IInvestment>;
export default Investment;
//# sourceMappingURL=Investment.d.ts.map