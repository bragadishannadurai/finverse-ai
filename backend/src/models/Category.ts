import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  name: string;
  type: 'expense' | 'income' | 'both';
  icon: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  budget?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    type: {
      type: String,
      enum: ['expense', 'income', 'both'],
      default: 'expense',
    },
    icon: { type: String, default: '💰' },
    color: { type: String, default: '#00E5FF' },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    budget: { type: Number, min: 0 },
    description: { type: String, maxlength: 200 },
  },
  { timestamps: true }
);

CategorySchema.index({ user: 1, type: 1 });
CategorySchema.index({ user: 1, name: 1 }, { unique: true });

const Category: Model<ICategory> = mongoose.model<ICategory>('Category', CategorySchema);
export default Category;
