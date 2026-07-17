import mongoose, { Document, Model } from 'mongoose';
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
        items?: Array<{
            name: string;
            price: number;
            quantity?: number;
        }>;
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
declare const Receipt: Model<IReceipt>;
export default Receipt;
//# sourceMappingURL=Receipt.d.ts.map