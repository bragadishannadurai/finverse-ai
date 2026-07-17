import mongoose, { Document, Model } from 'mongoose';
export interface IMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    tokens?: number;
}
export interface IAIChat extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    title: string;
    messages: IMessage[];
    totalTokens: number;
    aiModel: string;
    context?: Record<string, unknown>;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const AIChat: Model<IAIChat>;
export default AIChat;
//# sourceMappingURL=AIChat.d.ts.map