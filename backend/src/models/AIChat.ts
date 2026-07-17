import mongoose, { Document, Schema, Model } from 'mongoose';

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

const AIMessageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tokens: { type: Number },
  },
  { _id: false }
);

const AIChatSchema = new Schema<IAIChat>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200, default: 'New Chat' },
    messages: [AIMessageSchema],
    totalTokens: { type: Number, default: 0 },
    aiModel: { type: String, default: 'gpt-4o-mini' },
    context: { type: Schema.Types.Mixed },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AIChatSchema.index({ user: 1, createdAt: -1 });

const AIChat: Model<IAIChat> = mongoose.model<IAIChat>('AIChat', AIChatSchema);
export default AIChat;
