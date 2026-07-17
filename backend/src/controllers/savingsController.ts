import { Request, Response } from 'express';
import SavingsGoal from '../models/SavingsGoal';
import BankAccount from '../models/BankAccount';
import Transaction from '../models/Transaction';
import { sendSuccess, sendCreated, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError, AppError } from '../utils/errors';

export const getSavingsGoals = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { user: req.userId, isActive: true };

  if (req.query.category) filter.category = req.query.category;
  if (req.query.isCompleted !== undefined) filter.isCompleted = req.query.isCompleted === 'true';

  const [goals, total] = await Promise.all([
    SavingsGoal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SavingsGoal.countDocuments(filter),
  ]);

  sendSuccess(res, { data: goals, meta: paginateMeta({ page, limit, total }) });
});

export const getSavingsGoal = asyncHandler(async (req: Request, res: Response) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId });
  if (!goal) throw new NotFoundError('Savings goal not found');
  sendSuccess(res, { data: goal });
});

export const createSavingsGoal = asyncHandler(async (req: Request, res: Response) => {
  // Add default milestones if none provided
  const body = req.body;
  if (!body.milestones || body.milestones.length === 0) {
    body.milestones = [
      { percentage: 25, label: '25% reached!', reached: false },
      { percentage: 50, label: 'Halfway there!', reached: false },
      { percentage: 75, label: '75% milestone!', reached: false },
      { percentage: 100, label: 'Goal achieved! 🎉', reached: false },
    ];
  }
  const goal = await SavingsGoal.create({ ...body, user: req.userId });
  sendCreated(res, { message: 'Savings goal created successfully', data: goal });
});

export const updateSavingsGoal = asyncHandler(async (req: Request, res: Response) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId });
  if (!goal) throw new NotFoundError('Savings goal not found');

  const updated = await SavingsGoal.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  sendSuccess(res, { message: 'Savings goal updated', data: updated });
});

export const deleteSavingsGoal = asyncHandler(async (req: Request, res: Response) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId });
  if (!goal) throw new NotFoundError('Savings goal not found');
  await goal.deleteOne();
  sendSuccess(res, { message: 'Savings goal deleted successfully' });
});

// GET /api/savings/history — completed/archived savings goals
export const getSavingsHistory = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);

  const [goals, total] = await Promise.all([
    SavingsGoal.find({ user: req.userId, isActive: false })
      .sort({ completedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SavingsGoal.countDocuments({ user: req.userId, isActive: false }),
  ]);

  sendSuccess(res, { data: goals, meta: paginateMeta({ page, limit, total }) });
});


// POST /api/savings/:id/contribute
export const contributeToGoal = asyncHandler(async (req: Request, res: Response) => {
  const { amount, bankAccount: bankAccountId } = req.body;
  if (!amount || amount <= 0) throw new AppError('Valid contribution amount is required', 400);

  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId });
  if (!goal) throw new NotFoundError('Savings goal not found');
  if (goal.isCompleted) throw new AppError('This goal is already completed', 400);

  let newBankBalance: number | undefined;
  let bankAccDoc: any = null;

  if (bankAccountId) {
    bankAccDoc = await BankAccount.findOne({ _id: bankAccountId, user: req.userId, isActive: true });
    if (!bankAccDoc) throw new NotFoundError('Bank account not found');
    if (bankAccDoc.balance < amount) throw new AppError('Insufficient bank balance', 400);
    newBankBalance = bankAccDoc.balance - amount;
  }

  const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
  const isNowCompleted = newAmount >= goal.targetAmount;

  // Check milestones
  const updatedMilestones = goal.milestones.map((m) => {
    const progressPct = (newAmount / goal.targetAmount) * 100;
    if (!m.reached && progressPct >= m.percentage) {
      return {
        percentage: m.percentage,
        label: m.label,
        reached: true,
        reachedAt: new Date(),
      };
    }
    return {
      percentage: m.percentage,
      label: m.label,
      reached: m.reached,
      reachedAt: m.reachedAt,
    };
  });

  const operations: Promise<any>[] = [];

  if (bankAccDoc && newBankBalance !== undefined) {
    operations.push(
      bankAccDoc.updateOne({ balance: newBankBalance, lastSynced: new Date() }),
      Transaction.create({
        user: req.userId,
        type: 'debit',
        amount,
        description: `Savings Contribution: ${goal.name}`,
        bankAccount: bankAccDoc._id,
        date: new Date(),
        status: 'completed',
        paymentMethod: 'bank_transfer',
        balance: newBankBalance,
        tags: ['savings-goal', 'contribution'],
      })
    );
  }

  operations.push(
    SavingsGoal.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          currentAmount: newAmount,
          milestones: updatedMilestones,
          isCompleted: isNowCompleted,
          lastPaidAt: new Date(),
          ...(isNowCompleted ? { completedAt: new Date(), isActive: false } : {}),
        },
      },
      { new: true }
    )
  );

  const results = await Promise.all(operations);
  const updated = results[results.length - 1];

  sendSuccess(res, {
    message: isNowCompleted ? '🎉 Congratulations! Goal achieved!' : 'Contribution added successfully',
    data: updated,
  });
});

// POST /api/savings/:id/auto-pay — configure / toggle auto-save with bank account
export const configureAutoSave = asyncHandler(async (req: Request, res: Response) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId });
  if (!goal) throw new NotFoundError('Savings goal not found');

  const { autoSave, autoSaveAmount, autoSaveInterval, autoSaveBankAccount } = req.body;

  if (autoSaveBankAccount) {
    const bankAcc = await BankAccount.findOne({ _id: autoSaveBankAccount, user: req.userId, isActive: true });
    if (!bankAcc) throw new AppError('Bank account not found', 404);
  }

  let nextPayDate: Date | undefined;
  if (autoSave && autoSaveInterval) {
    const now = new Date();
    nextPayDate = new Date(now);
    if (autoSaveInterval === 'daily') nextPayDate.setDate(nextPayDate.getDate() + 1);
    if (autoSaveInterval === 'weekly') nextPayDate.setDate(nextPayDate.getDate() + 7);
    if (autoSaveInterval === 'monthly') nextPayDate.setMonth(nextPayDate.getMonth() + 1);
  }

  const updated = await SavingsGoal.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        autoSave: autoSave ?? goal.autoSave,
        autoSaveAmount: autoSaveAmount ?? goal.autoSaveAmount,
        autoSaveInterval: autoSaveInterval ?? goal.autoSaveInterval,
        autoSaveBankAccount: autoSaveBankAccount ?? goal.autoSaveBankAccount,
        ...(nextPayDate ? { nextPayDate } : {}),
      },
    },
    { new: true }
  );

  sendSuccess(res, { message: 'Auto-save configured', data: updated });
});

// POST /api/savings/:id/pay-now — immediate contribution from bank account
export const savingsPayNow = asyncHandler(async (req: Request, res: Response) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, user: req.userId });
  if (!goal) throw new NotFoundError('Savings goal not found');
  if (goal.isCompleted) throw new AppError('This goal is already completed', 400);

  const amount = req.body.amount || goal.autoSaveAmount;
  if (!amount || amount <= 0) throw new AppError('Payment amount is required', 400);

  const bankAccountId = req.body.bankAccount || goal.autoSaveBankAccount;
  if (!bankAccountId) throw new AppError('No bank account linked. Please configure auto-save first.', 400);

  const bankAccount = await BankAccount.findOne({ _id: bankAccountId, user: req.userId, isActive: true });
  if (!bankAccount) throw new NotFoundError('Bank account not found');
  if (bankAccount.balance < amount) throw new AppError('Insufficient bank balance', 400);

  const newBankBalance = bankAccount.balance - amount;
  const newGoalAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
  const isNowCompleted = newGoalAmount >= goal.targetAmount;

  // Check milestones
  const updatedMilestones = goal.milestones.map((m) => {
    const progressPct = (newGoalAmount / goal.targetAmount) * 100;
    if (!m.reached && progressPct >= m.percentage) {
      return { percentage: m.percentage, label: m.label, reached: true, reachedAt: new Date() };
    }
    return { percentage: m.percentage, label: m.label, reached: m.reached, reachedAt: m.reachedAt };
  });

  let nextPayDate = new Date();
  if (goal.autoSaveInterval === 'daily') nextPayDate.setDate(nextPayDate.getDate() + 1);
  else if (goal.autoSaveInterval === 'weekly') nextPayDate.setDate(nextPayDate.getDate() + 7);
  else nextPayDate.setMonth(nextPayDate.getMonth() + 1);

  await Promise.all([
    bankAccount.updateOne({ balance: newBankBalance, lastSynced: new Date() }),
    Transaction.create({
      user: req.userId,
      type: 'debit',
      amount,
      description: `Auto-save: ${goal.name}`,
      bankAccount: bankAccount._id,
      date: new Date(),
      status: 'completed',
      paymentMethod: 'bank_transfer',
      balance: newBankBalance,
      tags: ['auto-save', 'savings-goal'],
    }),
    goal.updateOne({
      currentAmount: newGoalAmount,
      milestones: updatedMilestones,
      isCompleted: isNowCompleted,
      lastPaidAt: new Date(),
      nextPayDate,
      ...(isNowCompleted ? { completedAt: new Date(), isActive: false } : {}),
    }),
  ]);

  sendSuccess(res, {
    message: isNowCompleted
      ? '🎉 Congratulations! Goal achieved!'
      : `₹${amount.toLocaleString('en-IN')} saved towards ${goal.name}`,
    data: { newBankBalance, newGoalAmount, isCompleted: isNowCompleted, nextPayDate },
  });
});
