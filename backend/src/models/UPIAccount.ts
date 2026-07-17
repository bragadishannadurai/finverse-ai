import mongoose, { Document, Schema, Model } from 'mongoose';

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

const UPIAccountSchema = new Schema<IUPIAccount>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    upiId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[\w.-]+@[\w]+$/, 'Invalid UPI ID format'],
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    provider: {
      type: String,
      enum: ['gpay', 'phonepe', 'paytm', 'bhim', 'amazon_pay', 'other'],
      default: 'other',
    },
    linkedBank: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UPIAccountSchema.index({ user: 1 });
UPIAccountSchema.index({ user: 1, upiId: 1 }, { unique: true });

const UPIAccount: Model<IUPIAccount> = mongoose.model<IUPIAccount>('UPIAccount', UPIAccountSchema);
export default UPIAccount;
