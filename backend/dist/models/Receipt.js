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
const ReceiptSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expense: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Expense' },
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
}, { timestamps: true });
ReceiptSchema.index({ user: 1, createdAt: -1 });
const Receipt = mongoose_1.default.model('Receipt', ReceiptSchema);
exports.default = Receipt;
//# sourceMappingURL=Receipt.js.map