import { Request, Response } from 'express';
import Budget from '../models/Budget';
import Expense from '../models/Expense';
import Notification from '../models/Notification';
import { sendSuccess, sendCreated, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError } from '../utils/errors';
import { cacheDel } from '../config/redis';
import mongoose from 'mongoose';


export const getBudgets = asyncHandler(async (req: Request, res: Response) => {
  // Auto-expire budgets past their end date
  await Budget.updateMany(
    { user: req.userId, isActive: true, endDate: { $lt: new Date() } },
    { $set: { isActive: false } }
  );

  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { user: req.userId, isActive: true };

  if (req.query.period) filter.period = req.query.period;

  const [budgets, total] = await Promise.all([
    Budget.find(filter)
      .populate('category', 'name icon color')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Budget.countDocuments(filter),
  ]);

  sendSuccess(res, { data: budgets, meta: paginateMeta({ page, limit, total }) });
});


export const getBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.userId })
    .populate('category', 'name icon color');
  if (!budget) throw new NotFoundError('Budget not found');
  sendSuccess(res, { data: budget });
});

export const createBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await Budget.create({ ...req.body, user: req.userId });
  sendCreated(res, {
    message: 'Budget created successfully',
    data: await budget.populate('category', 'name icon color'),
  });
});

export const updateBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.userId });
  if (!budget) throw new NotFoundError('Budget not found');

  const updated = await Budget.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('category', 'name icon color');

  sendSuccess(res, { message: 'Budget updated', data: updated });
});

export const deleteBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.userId });
  if (!budget) throw new NotFoundError('Budget not found');
  await budget.deleteOne();
  sendSuccess(res, { message: 'Budget deleted successfully' });
});

// PATCH /api/budgets/:id/archive — manually move to history
export const archiveBudget = asyncHandler(async (req: Request, res: Response) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.userId });
  if (!budget) throw new NotFoundError('Budget not found');
  await budget.updateOne({ isActive: false });
  sendSuccess(res, { message: 'Budget archived', data: { _id: budget._id } });
});

// GET /api/budgets/history — expired / archived budgets
export const getBudgetHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);

  const [budgets, total] = await Promise.all([
    Budget.find({ user: req.userId, isActive: false })
      .populate('category', 'name icon color')
      .sort({ endDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Budget.countDocuments({ user: req.userId, isActive: false }),
  ]);

  sendSuccess(res, { data: budgets, meta: paginateMeta({ page, limit, total }) });
});


// Recalculate budget spent amounts based on actual expenses
export const syncBudgetSpending = asyncHandler(async (req: Request, res: Response) => {
  const budgets = await Budget.find({ user: req.userId, isActive: true });

  for (const budget of budgets) {
    const totalSpent = await Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.userId!),
          category: budget.category,
          date: { $gte: budget.startDate, $lte: budget.endDate },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const spent = totalSpent[0]?.total || 0;
    await budget.updateOne({ spent });

    // Send budget alert notification if threshold crossed
    const percentage = (spent / budget.amount) * 100;
    if (percentage >= budget.alertAt && !budget.isAlertSent) {
      await Notification.create({
        user: req.userId,
        type: 'budget_alert',
        title: `Budget Alert: ${budget.name}`,
        message: `You've used ${Math.round(percentage)}% of your ${budget.name} budget (₹${spent.toLocaleString('en-IN')} of ₹${budget.amount.toLocaleString('en-IN')})`,
        priority: percentage >= 100 ? 'critical' : 'high',
        icon: '⚠️',
      });
      await budget.updateOne({ isAlertSent: true });
    }
  }

  sendSuccess(res, { message: 'Budget spending synced successfully' });
});
