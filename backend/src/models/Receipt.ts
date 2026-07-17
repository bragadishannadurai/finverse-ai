import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IReceipt extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  expense?: mongoose.Types.ObjectId;
  imageUrl: string;
  publicId: string;
  ocrText?: string;
  ocrData?: {
    merchant?: string;
    amount?: number;
    date?: string;
    items?: Array<{ name: string; price: number; quantity?: number }>;
    tax?: number;
    total?: number;
    confidence?: number;
  };
  isProcessed: boolean;
  processingError?: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema<IReceipt>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expense: { type: Schema.Types.ObjectId, ref: 'Expense' },
    imageUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    ocrText: { type: String },
    ocrData: {
      merchant: { type: String },
      amount: { type: Number },
      date: { type: String },
      items: [
        {
          name: { type: String },
          price: { type: Number },
          quantity: { type: Number },
        },
      ],
      tax: { type: Number },
      total: { type: Number },
      confidence: { type: Number },
    },
    isProcessed: { type: Boolean, default: false },
    processingError: { type: String },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { timestamps: true }
);

ReceiptSchema.index({ user: 1, createdAt: -1 });

const Receipt: Model<IReceipt> = mongoose.model<IReceipt>('Receipt', ReceiptSchema);
export default Receipt;
