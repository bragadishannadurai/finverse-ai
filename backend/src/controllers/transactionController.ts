import { Request, Response } from 'express';
import Transaction from '../models/Transaction';
import { sendSuccess, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError } from '../utils/errors';

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { user: req.userId };

  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;

  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate)
      (filter.date as Record<string, unknown>)['$gte'] = new Date(req.query.startDate as string);
    if (req.query.endDate)
      (filter.date as Record<string, unknown>)['$lte'] = new Date(req.query.endDate as string);
  }

  const sortBy = (req.query.sortBy as string) || 'date';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('category', 'name icon color')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  sendSuccess(res, { data: transactions, meta: paginateMeta({ page, limit, total }) });
});

export const getTransaction = asyncHandler(async (req: Request, res: Response) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, user: req.userId })
    .populate('category', 'name icon color');
  if (!transaction) throw new NotFoundError('Transaction not found');
  sendSuccess(res, { data: transaction });
});

export const getTransactionStats = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [monthly, byType] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: req.user!._id, date: { $gte: startOfMonth } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { user: req.user!._id } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
  ]);

  sendSuccess(res, { data: { monthly, byType } });
});
