import { Request, Response } from 'express';
import Income from '../models/Income';
import Transaction from '../models/Transaction';
import { sendSuccess, sendCreated, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError } from '../utils/errors';
import { cacheDel } from '../config/redis';

export const getIncomes = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { user: req.userId };

  if (req.query.source) filter.source = req.query.source;
  if (req.query.isRecurring !== undefined) filter.isRecurring = req.query.isRecurring === 'true';
  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) (filter.date as Record<string, unknown>)['$gte'] = new Date(req.query.startDate as string);
    if (req.query.endDate) (filter.date as Record<string, unknown>)['$lte'] = new Date(req.query.endDate as string);
  }

  const [incomes, total] = await Promise.all([
    Income.find(filter)
      .populate('category', 'name icon color')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Income.countDocuments(filter),
  ]);

  sendSuccess(res, { data: incomes, meta: paginateMeta({ page, limit, total }) });
});

export const getIncome = asyncHandler(async (req: Request, res: Response) => {
  const income = await Income.findOne({ _id: req.params.id, user: req.userId })
    .populate('category', 'name icon color');
  if (!income) throw new NotFoundError('Income not found');
  sendSuccess(res, { data: income });
});

export const createIncome = asyncHandler(async (req: Request, res: Response) => {
  const income = await Income.create({ ...req.body, user: req.userId });

  await Transaction.create({
    user: req.userId,
    type: 'credit',
    amount: income.amount,
    currency: income.currency,
    description: income.title,
    category: income.category,
    incomeId: income._id,
    date: income.date,
    status: 'completed',
  });

  await cacheDel(`dashboard:${req.userId}`);

  sendCreated(res, {
    message: 'Income created successfully',
    data: await income.populate('category', 'name icon color'),
  });
});

export const updateIncome = asyncHandler(async (req: Request, res: Response) => {
  const income = await Income.findOne({ _id: req.params.id, user: req.userId });
  if (!income) throw new NotFoundError('Income not found');

  const updated = await Income.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('category', 'name icon color');

  await cacheDel(`dashboard:${req.userId}`);
  sendSuccess(res, { message: 'Income updated', data: updated });
});

export const deleteIncome = asyncHandler(async (req: Request, res: Response) => {
  const income = await Income.findOne({ _id: req.params.id, user: req.userId });
  if (!income) throw new NotFoundError('Income not found');

  await income.deleteOne();
  await Transaction.deleteOne({ incomeId: income._id });
  await cacheDel(`dashboard:${req.userId}`);

  sendSuccess(res, { message: 'Income deleted successfully' });
});

export const getIncomeSummary = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [summary, bySource] = await Promise.all([
    Income.aggregate([
      { $match: { user: req.user!._id, date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } },
    ]),
    Income.aggregate([
      { $match: { user: req.user!._id, date: { $gte: startOfMonth } } },
      { $group: { _id: '$source', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  sendSuccess(res, { data: { summary: summary[0] || {}, bySource } });
});
