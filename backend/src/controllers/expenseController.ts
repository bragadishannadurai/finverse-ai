import { Request, Response } from 'express';
import Expense from '../models/Expense';
import Transaction from '../models/Transaction';
import BankAccount from '../models/BankAccount';
import { sendSuccess, sendCreated, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError, ForbiddenError } from '../utils/errors';
import { cacheGet, cacheSet, cacheDel } from '../config/redis';
import { uploadReceipt } from '../services/uploadService';
import { analyzeReceiptWithAI } from '../services/aiService';
import Receipt from '../models/Receipt';


const buildExpenseFilter = (userId: string, query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = { user: userId };

  if (query.category) filter.category = query.category;
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.isRecurring !== undefined) filter.isRecurring = query.isRecurring === 'true';

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) (filter.date as Record<string, unknown>)['$gte'] = new Date(query.startDate as string);
    if (query.endDate) (filter.date as Record<string, unknown>)['$lte'] = new Date(query.endDate as string);
  }

  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) (filter.amount as Record<string, unknown>)['$gte'] = Number(query.minAmount);
    if (query.maxAmount) (filter.amount as Record<string, unknown>)['$lte'] = Number(query.maxAmount);
  }

  if (query.search) {
    filter['$text'] = { $search: query.search };
  }

  if (query.tags) {
    filter.tags = { $in: (query.tags as string).split(',') };
  }

  return filter;
};

// GET /api/expenses
export const getExpenses = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const sortBy = (req.query.sortBy as string) || 'date';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = buildExpenseFilter(req.userId!, req.query as Record<string, unknown>);

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate('category', 'name icon color')
      .populate('bankAccount', 'bankName accountNumber accountType color icon')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  sendSuccess(res, {
    data: expenses,
    meta: paginateMeta({ page, limit, total }),
  });
});

// GET /api/expenses/:id
export const getExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.findOne({ _id: req.params.id, user: req.userId })
    .populate('category', 'name icon color')
    .populate('bankAccount', 'bankName accountNumber accountType color icon');
  if (!expense) throw new NotFoundError('Expense not found');
  sendSuccess(res, { data: expense });
});

// POST /api/expenses
export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.create({ ...req.body, user: req.userId });

  // ── Auto-debit linked bank account ──────────────────────────────────────
  let bankBalance: number | undefined;
  if (expense.bankAccount) {
    const bankAcc = await BankAccount.findOne({ _id: expense.bankAccount, user: req.userId, isActive: true });
    if (bankAcc) {
      bankBalance = Math.max(0, bankAcc.balance - expense.amount);
      await Promise.all([
        bankAcc.updateOne({ balance: bankBalance, lastSynced: new Date() }),
        Transaction.create({
          user: req.userId,
          type: 'debit',
          amount: expense.amount,
          currency: expense.currency,
          description: expense.title,
          category: expense.category,
          expenseId: expense._id,
          bankAccount: expense.bankAccount,
          date: expense.date,
          paymentMethod: expense.paymentMethod,
          merchant: expense.merchant,
          status: 'completed',
          balance: bankBalance,
          tags: ['expense'],
        }),
      ]);
    }
  } else {
    // Create generic transaction (no bank account link)
    await Transaction.create({
      user: req.userId,
      type: 'debit',
      amount: expense.amount,
      currency: expense.currency,
      description: expense.title,
      category: expense.category,
      expenseId: expense._id,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      merchant: expense.merchant,
      status: 'completed',
    });
  }

  await cacheDel(`dashboard:${req.userId}`);

  sendCreated(res, {
    message: 'Expense created successfully',
    data: await expense.populate([
      { path: 'category', select: 'name icon color' },
      { path: 'bankAccount', select: 'bankName accountNumber accountType color icon' },
    ]),
  });
});

// PUT /api/expenses/:id
export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.findOne({ _id: req.params.id, user: req.userId });
  if (!expense) throw new NotFoundError('Expense not found');

  const oldAmount = expense.amount;
  const oldBankAccountId = expense.bankAccount?.toString();
  const newAmount = req.body.amount ?? oldAmount;
  const newBankAccountId = req.body.bankAccount ?? oldBankAccountId;

  // Adjust bank balance if amount or bank account changed
  if (oldBankAccountId || newBankAccountId) {
    // Refund old bank account if it existed
    if (oldBankAccountId) {
      const oldBank = await BankAccount.findOne({ _id: oldBankAccountId, user: req.userId, isActive: true });
      if (oldBank) {
        await oldBank.updateOne({ balance: oldBank.balance + oldAmount, lastSynced: new Date() });
      }
    }
    // Debit new bank account
    if (newBankAccountId) {
      const newBank = await BankAccount.findOne({ _id: newBankAccountId, user: req.userId, isActive: true });
      if (newBank) {
        const newBalance = Math.max(0, newBank.balance - newAmount);
        await newBank.updateOne({ balance: newBalance, lastSynced: new Date() });
        // Update linked transaction balance
        await Transaction.findOneAndUpdate(
          { expenseId: expense._id },
          { amount: newAmount, bankAccount: newBankAccountId, balance: newBalance }
        );
      }
    }
  } else if (newAmount !== oldAmount) {
    // No bank account, just update transaction amount
    await Transaction.findOneAndUpdate({ expenseId: expense._id }, { amount: newAmount });
  }

  const updated = await Expense.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('category', 'name icon color').populate('bankAccount', 'bankName accountNumber accountType color icon');

  await cacheDel(`dashboard:${req.userId}`);

  sendSuccess(res, { message: 'Expense updated', data: updated });
});

// DELETE /api/expenses/:id
export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.findOne({ _id: req.params.id, user: req.userId });
  if (!expense) throw new NotFoundError('Expense not found');

  // ── Refund bank account if expense was linked ────────────────────────────
  if (expense.bankAccount) {
    const bankAcc = await BankAccount.findOne({ _id: expense.bankAccount, user: req.userId, isActive: true });
    if (bankAcc) {
      await bankAcc.updateOne({ balance: bankAcc.balance + expense.amount, lastSynced: new Date() });
    }
  }

  await expense.deleteOne();
  await Transaction.deleteOne({ expenseId: expense._id });
  await cacheDel(`dashboard:${req.userId}`);

  sendSuccess(res, { message: 'Expense deleted successfully' });
});


// GET /api/expenses/stats/summary
export const getExpenseSummary = asyncHandler(async (req: Request, res: Response) => {
  const cacheKey = `expense:summary:${req.userId}:${req.query.month}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return sendSuccess(res, { data: cached });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [summary, byCategory] = await Promise.all([
    Expense.aggregate([
      { $match: { user: req.user!._id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          maxAmount: { $max: '$amount' },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { user: req.user!._id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { category: { name: 1, icon: 1, color: 1 }, total: 1, count: 1 } },
    ]),
  ]);

  const data = { summary: summary[0] || {}, byCategory };
  await cacheSet(cacheKey, data, 1800);
  sendSuccess(res, { data });
});

// POST /api/expenses/:id/receipt
export const uploadExpenseReceipt = asyncHandler(async (req: Request, res: Response) => {
  const expense = await Expense.findOne({ _id: req.params.id, user: req.userId });
  if (!expense) throw new NotFoundError('Expense not found');

  if (!req.file) throw new Error('No file uploaded');

  const uploadResult = await uploadReceipt(req.file.buffer, req.userId!);

  // OCR with AI
  let ocrData = {};
  try {
    ocrData = await analyzeReceiptWithAI(uploadResult.url);
  } catch { /* OCR failed, continue */ }

  const receipt = await Receipt.create({
    user: req.userId,
    expense: expense._id,
    imageUrl: uploadResult.url,
    publicId: uploadResult.publicId,
    ocrData,
    isProcessed: true,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  });

  await expense.updateOne({
    receipt: uploadResult.url,
    receiptPublicId: uploadResult.publicId,
    ocrData,
  });

  sendSuccess(res, { message: 'Receipt uploaded and analyzed', data: receipt });
});
