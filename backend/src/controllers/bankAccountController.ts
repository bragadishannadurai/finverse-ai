import { Request, Response } from 'express';
import mongoose from 'mongoose';
import BankAccount from '../models/BankAccount';
import Transaction from '../models/Transaction';
import { sendSuccess, sendCreated, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError, AppError } from '../utils/errors';

// ─── GET /api/bank-accounts ───────────────────────────────────────────────────
export const getBankAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await BankAccount.find({ user: req.userId, isActive: true })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean();

  // Compute total balance
  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);

  sendSuccess(res, { data: { accounts, totalBalance } });
});

// ─── GET /api/bank-accounts/:id ──────────────────────────────────────────────
export const getBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await BankAccount.findOne({ _id: req.params.id, user: req.userId, isActive: true });
  if (!account) throw new NotFoundError('Bank account not found');
  sendSuccess(res, { data: account });
});

// ─── POST /api/bank-accounts ─────────────────────────────────────────────────
export const createBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const { bankName, accountNumber, accountType, balance, ifscCode, branchName, color, icon, isDefault } = req.body;

  // If setting as default, unset previous default
  if (isDefault) {
    await BankAccount.updateMany({ user: req.userId }, { isDefault: false });
  }

  // If first account, make it default
  const count = await BankAccount.countDocuments({ user: req.userId, isActive: true });
  const shouldBeDefault = isDefault || count === 0;

  const account = await BankAccount.create({
    user: req.userId,
    bankName,
    accountNumber,
    accountType: accountType || 'savings',
    balance: balance || 0,
    ifscCode,
    branchName,
    color: color || '#00E5FF',
    icon: icon || '🏦',
    isDefault: shouldBeDefault,
    lastSynced: new Date(),
  });

  // Record initial balance as a credit transaction if balance > 0
  if (balance && balance > 0) {
    await Transaction.create({
      user: req.userId,
      type: 'credit',
      amount: balance,
      description: 'Opening balance',
      bankAccount: account._id,
      date: new Date(),
      status: 'completed',
      paymentMethod: 'bank_transfer',
      balance: balance,
    });
  }

  sendCreated(res, { message: 'Bank account added successfully', data: account });
});

// ─── PUT /api/bank-accounts/:id ──────────────────────────────────────────────
export const updateBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await BankAccount.findOne({ _id: req.params.id, user: req.userId });
  if (!account) throw new NotFoundError('Bank account not found');

  if (req.body.isDefault) {
    await BankAccount.updateMany({ user: req.userId }, { isDefault: false });
  }

  const updated = await BankAccount.findByIdAndUpdate(
    req.params.id,
    { $set: { ...req.body, lastSynced: new Date() } },
    { new: true, runValidators: true }
  );

  sendSuccess(res, { message: 'Bank account updated', data: updated });
});

// ─── DELETE /api/bank-accounts/:id ───────────────────────────────────────────
export const deleteBankAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await BankAccount.findOne({ _id: req.params.id, user: req.userId });
  if (!account) throw new NotFoundError('Bank account not found');

  await account.updateOne({ isActive: false });
  sendSuccess(res, { message: 'Bank account removed' });
});

// ─── GET /api/bank-accounts/:id/transactions ─────────────────────────────────
export const getAccountTransactions = asyncHandler(async (req: Request, res: Response) => {
  const account = await BankAccount.findOne({ _id: req.params.id, user: req.userId });
  if (!account) throw new NotFoundError('Bank account not found');

  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = {
    user: req.userId,
    bankAccount: new mongoose.Types.ObjectId(req.params.id as string),
  };

  if (req.query.type) filter.type = req.query.type;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);

  // Compute summary
  const summary = await Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.userId as string), bankAccount: new mongoose.Types.ObjectId(req.params.id as string) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const credits = summary.find(s => s._id === 'credit')?.total || 0;
  const debits = summary.find(s => s._id === 'debit')?.total || 0;

  sendSuccess(res, {
    data: {
      account: { bankName: account.bankName, balance: account.balance, accountType: account.accountType },
      transactions,
      summary: { credits, debits, net: credits - debits },
    },
    meta: paginateMeta({ page, limit, total }),
  });
});

// ─── POST /api/bank-accounts/:id/deposit ─────────────────────────────────────
export const depositToAccount = asyncHandler(async (req: Request, res: Response) => {
  const { amount, description, date } = req.body;
  if (!amount || amount <= 0) throw new AppError('Valid deposit amount required', 400);

  const account = await BankAccount.findOne({ _id: req.params.id, user: req.userId });
  if (!account) throw new NotFoundError('Bank account not found');

  const newBalance = account.balance + amount;

  await Promise.all([
    account.updateOne({ balance: newBalance, lastSynced: new Date() }),
    Transaction.create({
      user: req.userId,
      type: 'credit',
      amount,
      description: description || 'Deposit',
      bankAccount: account._id,
      date: date ? new Date(date) : new Date(),
      status: 'completed',
      paymentMethod: 'bank_transfer',
      balance: newBalance,
    }),
  ]);

  sendSuccess(res, {
    message: `₹${amount.toLocaleString('en-IN')} deposited successfully`,
    data: { newBalance },
  });
});

// ─── POST /api/bank-accounts/:id/withdraw ────────────────────────────────────
export const withdrawFromAccount = asyncHandler(async (req: Request, res: Response) => {
  const { amount, description, date } = req.body;
  if (!amount || amount <= 0) throw new AppError('Valid withdrawal amount required', 400);

  const account = await BankAccount.findOne({ _id: req.params.id, user: req.userId });
  if (!account) throw new NotFoundError('Bank account not found');

  if (account.balance < amount) throw new AppError('Insufficient balance', 400);

  const newBalance = account.balance - amount;

  await Promise.all([
    account.updateOne({ balance: newBalance, lastSynced: new Date() }),
    Transaction.create({
      user: req.userId,
      type: 'debit',
      amount,
      description: description || 'Withdrawal',
      bankAccount: account._id,
      date: date ? new Date(date) : new Date(),
      status: 'completed',
      paymentMethod: 'bank_transfer',
      balance: newBalance,
    }),
  ]);

  sendSuccess(res, {
    message: `₹${amount.toLocaleString('en-IN')} withdrawn successfully`,
    data: { newBalance },
  });
});

// ─── POST /api/bank-accounts/:id/set-default ─────────────────────────────────
export const setDefaultAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await BankAccount.findOne({ _id: req.params.id, user: req.userId });
  if (!account) throw new NotFoundError('Bank account not found');

  await BankAccount.updateMany({ user: req.userId }, { isDefault: false });
  await account.updateOne({ isDefault: true });

  sendSuccess(res, { message: 'Default account updated' });
});
