"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDefaultCategories = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategory = exports.getCategories = exports.seedUserCategories = exports.DEFAULT_CATEGORIES = void 0;
const Category_1 = __importDefault(require("../models/Category"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
exports.DEFAULT_CATEGORIES = [
    { name: 'Food & Dining', type: 'expense', icon: '🍽️', color: '#FF6B6B', isDefault: true },
    { name: 'Transportation', type: 'expense', icon: '🚗', color: '#4ECDC4', isDefault: true },
    { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#45B7D1', isDefault: true },
    { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#96CEB4', isDefault: true },
    { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#FFEAA7', isDefault: true },
    { name: 'Education', type: 'expense', icon: '📚', color: '#DDA0DD', isDefault: true },
    { name: 'Utilities', type: 'expense', icon: '⚡', color: '#98D8C8', isDefault: true },
    { name: 'Rent / EMI', type: 'expense', icon: '🏠', color: '#F0A500', isDefault: true },
    { name: 'Groceries', type: 'expense', icon: '🛒', color: '#A8E6CF', isDefault: true },
    { name: 'Travel', type: 'expense', icon: '✈️', color: '#FFD3A5', isDefault: true },
    { name: 'Salary', type: 'income', icon: '💼', color: '#00E5FF', isDefault: true },
    { name: 'Freelance', type: 'income', icon: '💻', color: '#7B68EE', isDefault: true },
    { name: 'Investment Returns', type: 'income', icon: '📈', color: '#32CD32', isDefault: true },
    { name: 'Other Income', type: 'income', icon: '💰', color: '#FFB347', isDefault: true },
];
const seedUserCategories = async (userId) => {
    await Category_1.default.insertMany(exports.DEFAULT_CATEGORIES.map((c) => ({ ...c, user: userId })));
};
exports.seedUserCategories = seedUserCategories;
exports.getCategories = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = { user: req.userId, isActive: true };
    if (req.query.type)
        filter.type = req.query.type;
    // Auto-seed if user has zero categories
    const count = await Category_1.default.countDocuments({ user: req.userId });
    if (count === 0) {
        await (0, exports.seedUserCategories)(req.userId);
    }
    const [categories, total] = await Promise.all([
        Category_1.default.find(filter).sort({ isDefault: -1, name: 1 }).skip(skip).limit(limit).lean(),
        Category_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: categories, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
exports.getCategory = (0, errors_1.asyncHandler)(async (req, res) => {
    const category = await Category_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!category)
        throw new errors_1.NotFoundError('Category not found');
    (0, apiResponse_1.sendSuccess)(res, { data: category });
});
exports.createCategory = (0, errors_1.asyncHandler)(async (req, res) => {
    const category = await Category_1.default.create({ ...req.body, user: req.userId });
    (0, apiResponse_1.sendCreated)(res, { message: 'Category created successfully', data: category });
});
exports.updateCategory = (0, errors_1.asyncHandler)(async (req, res) => {
    const category = await Category_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!category)
        throw new errors_1.NotFoundError('Category not found');
    const updated = await Category_1.default.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Category updated', data: updated });
});
exports.deleteCategory = (0, errors_1.asyncHandler)(async (req, res) => {
    const category = await Category_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!category)
        throw new errors_1.NotFoundError('Category not found');
    if (category.isDefault) {
        throw new errors_1.ForbiddenError('Cannot delete default categories');
    }
    await category.deleteOne();
    (0, apiResponse_1.sendSuccess)(res, { message: 'Category deleted successfully' });
});
// POST /api/categories/seed — create default categories for user
exports.seedDefaultCategories = (0, errors_1.asyncHandler)(async (req, res) => {
    const existingCount = await Category_1.default.countDocuments({ user: req.userId });
    if (existingCount > 0) {
        return (0, apiResponse_1.sendSuccess)(res, { message: 'Categories already exist', data: [] });
    }
    const categories = await Category_1.default.insertMany(exports.DEFAULT_CATEGORIES.map((c) => ({ ...c, user: req.userId })));
    (0, apiResponse_1.sendCreated)(res, { message: 'Default categories created', data: categories });
});
//# sourceMappingURL=categoryController.js.map