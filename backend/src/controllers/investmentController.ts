import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Investment from '../models/Investment';
import BankAccount from '../models/BankAccount';
import Transaction from '../models/Transaction';
import { sendSuccess, sendCreated, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError, AppError } from '../utils/errors';

export const getInvestments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { user: req.userId, isActive: true };

  if (req.query.type) filter.type = req.query.type;
  if (req.query.isSIP !== undefined) filter.isSIP = req.query.isSIP === 'true';

  const [investments, total] = await Promise.all([
    Investment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Investment.countDocuments(filter),
  ]);

  sendSuccess(res, { data: investments, meta: paginateMeta({ page, limit, total }) });
});

export const getInvestment = asyncHandler(async (req: Request, res: Response) => {
  const investment = await Investment.findOne({ _id: req.params.id, user: req.userId });
  if (!investment) throw new NotFoundError('Investment not found');
  sendSuccess(res, { data: investment });
});

export const createInvestment = asyncHandler(async (req: Request, res: Response) => {
  const investment = await Investment.create({ ...req.body, user: req.userId });
  sendCreated(res, { message: 'Investment created successfully', data: investment });
});

export const updateInvestment = asyncHandler(async (req: Request, res: Response) => {
  const investment = await Investment.findOne({ _id: req.params.id, user: req.userId });
  if (!investment) throw new NotFoundError('Investment not found');

  // Update current price and recalculate returns
  const updated = await Investment.findByIdAndUpdate(
    req.params.id,
    { $set: { ...req.body, lastUpdated: new Date() } },
    { new: true, runValidators: true }
  );

  sendSuccess(res, { message: 'Investment updated', data: updated });
});

export const deleteInvestment = asyncHandler(async (req: Request, res: Response) => {
  const investment = await Investment.findOne({ _id: req.params.id, user: req.userId });
  if (!investment) throw new NotFoundError('Investment not found');
  await investment.deleteOne();
  sendSuccess(res, { message: 'Investment deleted successfully' });
});

// PATCH /api/investments/:id/archive — mark as completed/sold → moves to history
export const archiveInvestment = asyncHandler(async (req: Request, res: Response) => {
  const investment = await Investment.findOne({ _id: req.params.id, user: req.userId });
  if (!investment) throw new NotFoundError('Investment not found');

  const updated = await Investment.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isActive: false,
        lastUpdated: new Date(),
        // Optionally record final value from body
        ...(req.body.currentValue !== undefined ? { currentValue: req.body.currentValue } : {}),
        ...(req.body.currentPrice !== undefined ? { currentPrice: req.body.currentPrice } : {}),
        ...(req.body.notes !== undefined ? { notes: req.body.notes } : {}),
      },
    },
    { new: true }
  );

  sendSuccess(res, { message: 'Investment archived successfully', data: updated });
});

// GET /api/investments/history — returns completed/archived investments
export const getInvestmentHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);

  const filter: Record<string, unknown> = { user: req.userId, isActive: false };
  if (req.query.type) filter.type = req.query.type;

  const [investments, total] = await Promise.all([
    Investment.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Investment.countDocuments(filter),
  ]);

  sendSuccess(res, { data: investments, meta: paginateMeta({ page, limit, total }) });
});


export const getInvestmentSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await Investment.aggregate([
    { $match: { user: req.user!._id, isActive: true } },
    {
      $group: {
        _id: '$type',
        totalInvested: { $sum: '$investedAmount' },
        currentValue: { $sum: '$currentValue' },
        returns: { $sum: '$returns' },
        count: { $sum: 1 },
      },
    },
    { $sort: { currentValue: -1 } },
  ]);

  const totals = await Investment.aggregate([
    { $match: { user: req.user!._id, isActive: true } },
    {
      $group: {
        _id: null,
        totalInvested: { $sum: '$investedAmount' },
        currentValue: { $sum: '$currentValue' },
        totalReturns: { $sum: '$returns' },
        totalDividends: { $sum: '$dividends' },
      },
    },
  ]);

  sendSuccess(res, { data: { byType: summary, totals: totals[0] || {} } });
});

// POST /api/investments/:id/auto-pay — configure / toggle auto-pay
export const configureAutoPay = asyncHandler(async (req: Request, res: Response) => {
  const investment = await Investment.findOne({ _id: req.params.id, user: req.userId });
  if (!investment) throw new NotFoundError('Investment not found');

  const { autoPay, autoPayAmount, autoPayInterval, autoPayBankAccount } = req.body;

  // Validate bank account belongs to user
  if (autoPayBankAccount) {
    const bankAcc = await BankAccount.findOne({ _id: autoPayBankAccount, user: req.userId, isActive: true });
    if (!bankAcc) throw new AppError('Bank account not found', 404);
  }

  // Calculate next pay date
  let nextPayDate: Date | undefined;
  if (autoPay && autoPayInterval) {
    const now = new Date();
    nextPayDate = new Date(now);
    if (autoPayInterval === 'weekly') nextPayDate.setDate(nextPayDate.getDate() + 7);
    if (autoPayInterval === 'monthly') nextPayDate.setMonth(nextPayDate.getMonth() + 1);
  }

  const updated = await Investment.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        autoPay: autoPay ?? investment.autoPay,
        autoPayAmount: autoPayAmount ?? investment.autoPayAmount,
        autoPayInterval: autoPayInterval ?? investment.autoPayInterval,
        autoPayBankAccount: autoPayBankAccount ?? investment.autoPayBankAccount,
        ...(nextPayDate ? { nextPayDate } : {}),
      },
    },
    { new: true }
  );

  sendSuccess(res, { message: 'Auto-pay configured', data: updated });
});

// POST /api/investments/:id/pay-now — immediate auto-pay deduction
export const payNow = asyncHandler(async (req: Request, res: Response) => {
  const investment = await Investment.findOne({ _id: req.params.id, user: req.userId });
  if (!investment) throw new NotFoundError('Investment not found');

  const amount = req.body.amount || investment.autoPayAmount || investment.sipAmount;
  if (!amount || amount <= 0) throw new AppError('Payment amount is required', 400);

  const bankAccountId = req.body.bankAccount || investment.autoPayBankAccount;
  if (!bankAccountId) throw new AppError('No bank account linked. Please configure auto-pay first.', 400);

  const bankAccount = await BankAccount.findOne({ _id: bankAccountId, user: req.userId, isActive: true });
  if (!bankAccount) throw new NotFoundError('Bank account not found');
  if (bankAccount.balance < amount) throw new AppError('Insufficient bank balance', 400);

  const newBalance = bankAccount.balance - amount;

  // Calculate next pay date
  let nextPayDate = new Date();
  if (investment.autoPayInterval === 'weekly') nextPayDate.setDate(nextPayDate.getDate() + 7);
  else nextPayDate.setMonth(nextPayDate.getMonth() + 1);

  await Promise.all([
    bankAccount.updateOne({ balance: newBalance, lastSynced: new Date() }),
    Transaction.create({
      user: req.userId,
      type: 'debit',
      amount,
      description: `Auto-pay: ${investment.name}`,
      bankAccount: bankAccount._id,
      date: new Date(),
      status: 'completed',
      paymentMethod: 'bank_transfer',
      balance: newBalance,
      tags: ['auto-pay', 'investment'],
    }),
    investment.updateOne({
      investedAmount: investment.investedAmount + amount,
      lastPaidAt: new Date(),
      nextPayDate,
      lastUpdated: new Date(),
    }),
  ]);

  sendSuccess(res, {
    message: `₹${amount.toLocaleString('en-IN')} invested in ${investment.name}`,
    data: { newBankBalance: newBalance, amountInvested: amount, nextPayDate },
  });
});
