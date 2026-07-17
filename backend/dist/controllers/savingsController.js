"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.savingsPayNow = exports.configureAutoSave = exports.contributeToGoal = exports.getSavingsHistory = exports.deleteSavingsGoal = exports.updateSavingsGoal = exports.createSavingsGoal = exports.getSavingsGoal = exports.getSavingsGoals = void 0;
const SavingsGoal_1 = __importDefault(require("../models/SavingsGoal"));
const BankAccount_1 = __importDefault(require("../models/BankAccount"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
exports.getSavingsGoals = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = { user: req.userId, isActive: true };
    if (req.query.category)
        filter.category = req.query.category;
    if (req.query.isCompleted !== undefined)
        filter.isCompleted = req.query.isCompleted === 'true';
    const [goals, total] = await Promise.all([
        SavingsGoal_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        SavingsGoal_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: goals, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
exports.getSavingsGoal = (0, errors_1.asyncHandler)(async (req, res) => {
    const goal = await SavingsGoal_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!goal)
        throw new errors_1.NotFoundError('Savings goal not found');
    (0, apiResponse_1.sendSuccess)(res, { data: goal });
});
exports.createSavingsGoal = (0, errors_1.asyncHandler)(async (req, res) => {
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
    const goal = await SavingsGoal_1.default.create({ ...body, user: req.userId });
    (0, apiResponse_1.sendCreated)(res, { message: 'Savings goal created successfully', data: goal });
});
exports.updateSavingsGoal = (0, errors_1.asyncHandler)(async (req, res) => {
    const goal = await SavingsGoal_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!goal)
        throw new errors_1.NotFoundError('Savings goal not found');
    const updated = await SavingsGoal_1.default.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Savings goal updated', data: updated });
});
exports.deleteSavingsGoal = (0, errors_1.asyncHandler)(async (req, res) => {
    const goal = await SavingsGoal_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!goal)
        throw new errors_1.NotFoundError('Savings goal not found');
    await goal.deleteOne();
    (0, apiResponse_1.sendSuccess)(res, { message: 'Savings goal deleted successfully' });
});
// GET /api/savings/history — completed/archived savings goals
exports.getSavingsHistory = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const [goals, total] = await Promise.all([
        SavingsGoal_1.default.find({ user: req.userId, isActive: false })
            .sort({ completedAt: -1, updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SavingsGoal_1.default.countDocuments({ user: req.userId, isActive: false }),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: goals, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
// POST /api/savings/:id/contribute
exports.contributeToGoal = (0, errors_1.asyncHandler)(async (req, res) => {
    const { amount, bankAccount: bankAccountId } = req.body;
    if (!amount || amount <= 0)
        throw new errors_1.AppError('Valid contribution amount is required', 400);
    const goal = await SavingsGoal_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!goal)
        throw new errors_1.NotFoundError('Savings goal not found');
    if (goal.isCompleted)
        throw new errors_1.AppError('This goal is already completed', 400);
    let newBankBalance;
    let bankAccDoc = null;
    if (bankAccountId) {
        bankAccDoc = await BankAccount_1.default.findOne({ _id: bankAccountId, user: req.userId, isActive: true });
        if (!bankAccDoc)
            throw new errors_1.NotFoundError('Bank account not found');
        if (bankAccDoc.balance < amount)
            throw new errors_1.AppError('Insufficient bank balance', 400);
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
    const operations = [];
    if (bankAccDoc && newBankBalance !== undefined) {
        operations.push(bankAccDoc.updateOne({ balance: newBankBalance, lastSynced: new Date() }), Transaction_1.default.create({
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
        }));
    }
    operations.push(SavingsGoal_1.default.findByIdAndUpdate(req.params.id, {
        $set: {
            currentAmount: newAmount,
            milestones: updatedMilestones,
            isCompleted: isNowCompleted,
            lastPaidAt: new Date(),
            ...(isNowCompleted ? { completedAt: new Date(), isActive: false } : {}),
        },
    }, { new: true }));
    const results = await Promise.all(operations);
    const updated = results[results.length - 1];
    (0, apiResponse_1.sendSuccess)(res, {
        message: isNowCompleted ? '🎉 Congratulations! Goal achieved!' : 'Contribution added successfully',
        data: updated,
    });
});
// POST /api/savings/:id/auto-pay — configure / toggle auto-save with bank account
exports.configureAutoSave = (0, errors_1.asyncHandler)(async (req, res) => {
    const goal = await SavingsGoal_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!goal)
        throw new errors_1.NotFoundError('Savings goal not found');
    const { autoSave, autoSaveAmount, autoSaveInterval, autoSaveBankAccount } = req.body;
    if (autoSaveBankAccount) {
        const bankAcc = await BankAccount_1.default.findOne({ _id: autoSaveBankAccount, user: req.userId, isActive: true });
        if (!bankAcc)
            throw new errors_1.AppError('Bank account not found', 404);
    }
    let nextPayDate;
    if (autoSave && autoSaveInterval) {
        const now = new Date();
        nextPayDate = new Date(now);
        if (autoSaveInterval === 'daily')
            nextPayDate.setDate(nextPayDate.getDate() + 1);
        if (autoSaveInterval === 'weekly')
            nextPayDate.setDate(nextPayDate.getDate() + 7);
        if (autoSaveInterval === 'monthly')
            nextPayDate.setMonth(nextPayDate.getMonth() + 1);
    }
    const updated = await SavingsGoal_1.default.findByIdAndUpdate(req.params.id, {
        $set: {
            autoSave: autoSave ?? goal.autoSave,
            autoSaveAmount: autoSaveAmount ?? goal.autoSaveAmount,
            autoSaveInterval: autoSaveInterval ?? goal.autoSaveInterval,
            autoSaveBankAccount: autoSaveBankAccount ?? goal.autoSaveBankAccount,
            ...(nextPayDate ? { nextPayDate } : {}),
        },
    }, { new: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Auto-save configured', data: updated });
});
// POST /api/savings/:id/pay-now — immediate contribution from bank account
exports.savingsPayNow = (0, errors_1.asyncHandler)(async (req, res) => {
    const goal = await SavingsGoal_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!goal)
        throw new errors_1.NotFoundError('Savings goal not found');
    if (goal.isCompleted)
        throw new errors_1.AppError('This goal is already completed', 400);
    const amount = req.body.amount || goal.autoSaveAmount;
    if (!amount || amount <= 0)
        throw new errors_1.AppError('Payment amount is required', 400);
    const bankAccountId = req.body.bankAccount || goal.autoSaveBankAccount;
    if (!bankAccountId)
        throw new errors_1.AppError('No bank account linked. Please configure auto-save first.', 400);
    const bankAccount = await BankAccount_1.default.findOne({ _id: bankAccountId, user: req.userId, isActive: true });
    if (!bankAccount)
        throw new errors_1.NotFoundError('Bank account not found');
    if (bankAccount.balance < amount)
        throw new errors_1.AppError('Insufficient bank balance', 400);
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
    if (goal.autoSaveInterval === 'daily')
        nextPayDate.setDate(nextPayDate.getDate() + 1);
    else if (goal.autoSaveInterval === 'weekly')
        nextPayDate.setDate(nextPayDate.getDate() + 7);
    else
        nextPayDate.setMonth(nextPayDate.getMonth() + 1);
    await Promise.all([
        bankAccount.updateOne({ balance: newBankBalance, lastSynced: new Date() }),
        Transaction_1.default.create({
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
    (0, apiResponse_1.sendSuccess)(res, {
        message: isNowCompleted
            ? '🎉 Congratulations! Goal achieved!'
            : `₹${amount.toLocaleString('en-IN')} saved towards ${goal.name}`,
        data: { newBankBalance, newGoalAmount, isCompleted: isNowCompleted, nextPayDate },
    });
});
//# sourceMappingURL=savingsController.js.map