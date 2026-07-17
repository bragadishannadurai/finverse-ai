import mongoose, { Document, Model } from 'mongoose';
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
declare const Category: Model<ICategory>;
export default Category;
//# sourceMappingURL=Category.d.ts.map