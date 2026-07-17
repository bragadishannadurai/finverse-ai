import { Request, Response } from 'express';
import Category from '../models/Category';
import { sendSuccess, sendCreated, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError, ForbiddenError } from '../utils/errors';

export const DEFAULT_CATEGORIES = [
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

export const seedUserCategories = async (userId: string) => {
  await Category.insertMany(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, user: userId }))
  );
};

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { user: req.userId, isActive: true };

  if (req.query.type) filter.type = req.query.type;

  // Auto-seed if user has zero categories
  const count = await Category.countDocuments({ user: req.userId });
  if (count === 0) {
    await seedUserCategories(req.userId!);
  }

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ isDefault: -1, name: 1 }).skip(skip).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);

  sendSuccess(res, { data: categories, meta: paginateMeta({ page, limit, total }) });
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findOne({ _id: req.params.id, user: req.userId });
  if (!category) throw new NotFoundError('Category not found');
  sendSuccess(res, { data: category });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.create({ ...req.body, user: req.userId });
  sendCreated(res, { message: 'Category created successfully', data: category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findOne({ _id: req.params.id, user: req.userId });
  if (!category) throw new NotFoundError('Category not found');

  const updated = await Category.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  sendSuccess(res, { message: 'Category updated', data: updated });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await Category.findOne({ _id: req.params.id, user: req.userId });
  if (!category) throw new NotFoundError('Category not found');

  if (category.isDefault) {
    throw new ForbiddenError('Cannot delete default categories');
  }

  await category.deleteOne();
  sendSuccess(res, { message: 'Category deleted successfully' });
});

// POST /api/categories/seed — create default categories for user
export const seedDefaultCategories = asyncHandler(async (req: Request, res: Response) => {
  const existingCount = await Category.countDocuments({ user: req.userId });
  if (existingCount > 0) {
    return sendSuccess(res, { message: 'Categories already exist', data: [] });
  }

  const categories = await Category.insertMany(
    DEFAULT_CATEGORIES.map((c) => ({ ...c, user: req.userId }))
  );

  sendCreated(res, { message: 'Default categories created', data: categories });
});
