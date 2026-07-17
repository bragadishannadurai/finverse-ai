import mongoose, { Document, Model } from 'mongoose';
export interface IUPIAccount extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    upiId: string;
    name: string;
    provider: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'amazon_pay' | 'other';
    linkedBank?: mongoose.Types.ObjectId;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const UPIAccount: Model<IUPIAccount>;
export default UPIAccount;
//# sourceMappingURL=UPIAccount.d.ts.map