"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payNow = exports.configureAutoPay = exports.getInvestmentSummary = exports.getInvestmentHistory = exports.archiveInvestment = exports.deleteInvestment = exports.updateInvestment = exports.createInvestment = exports.getInvestment = exports.getInvestments = void 0;
const Investment_1 = __importDefault(require("../models/Investment"));
const BankAccount_1 = __importDefault(require("../models/BankAccount"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
exports.getInvestments = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = { user: req.userId, isActive: true };
    if (req.query.type)
        filter.type = req.query.type;
    if (req.query.isSIP !== undefined)
        filter.isSIP = req.query.isSIP === 'true';
    const [investments, total] = await Promise.all([
        Investment_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Investment_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: investments, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
exports.getInvestment = (0, errors_1.asyncHandler)(async (req, res) => {
    const investment = await Investment_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!investment)
        throw new errors_1.NotFoundError('Investment not found');
    (0, apiResponse_1.sendSuccess)(res, { data: investment });
});
exports.createInvestment = (0, errors_1.asyncHandler)(async (req, res) => {
    const investment = await Investment_1.default.create({ ...req.body, user: req.userId });
    (0, apiResponse_1.sendCreated)(res, { message: 'Investment created successfully', data: investment });
});
exports.updateInvestment = (0, errors_1.asyncHandler)(async (req, res) => {
    const investment = await Investment_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!investment)
        throw new errors_1.NotFoundError('Investment not found');
    // Update current price and recalculate returns
    const updated = await Investment_1.default.findByIdAndUpdate(req.params.id, { $set: { ...req.body, lastUpdated: new Date() } }, { new: true, runValidators: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Investment updated', data: updated });
});
exports.deleteInvestment = (0, errors_1.asyncHandler)(async (req, res) => {
    const investment = await Investment_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!investment)
        throw new errors_1.NotFoundError('Investment not found');
    await investment.deleteOne();
    (0, apiResponse_1.sendSuccess)(res, { message: 'Investment deleted successfully' });
});
// PATCH /api/investments/:id/archive — mark as completed/sold → moves to history
exports.archiveInvestment = (0, errors_1.asyncHandler)(async (req, res) => {
    const investment = await Investment_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!investment)
        throw new errors_1.NotFoundError('Investment not found');
    const updated = await Investment_1.default.findByIdAndUpdate(req.params.id, {
        $set: {
            isActive: false,
            lastUpdated: new Date(),
            // Optionally record final value from body
            ...(req.body.currentValue !== undefined ? { currentValue: req.body.currentValue } : {}),
            ...(req.body.currentPrice !== undefined ? { currentPrice: req.body.currentPrice } : {}),
            ...(req.body.notes !== undefined ? { notes: req.body.notes } : {}),
        },
    }, { new: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Investment archived successfully', data: updated });
});
// GET /api/investments/history — returns completed/archived investments
exports.getInvestmentHistory = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = { user: req.userId, isActive: false };
    if (req.query.type)
        filter.type = req.query.type;
    const [investments, total] = await Promise.all([
        Investment_1.default.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
        Investment_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: investments, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
exports.getInvestmentSummary = (0, errors_1.asyncHandler)(async (req, res) => {
    const summary = await Investment_1.default.aggregate([
        { $match: { user: req.user._id, isActive: true } },
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
    const totals = await Investment_1.default.aggregate([
        { $match: { user: req.user._id, isActive: true } },
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
    (0, apiResponse_1.sendSuccess)(res, { data: { byType: summary, totals: totals[0] || {} } });
});
// POST /api/investments/:id/auto-pay — configure / toggle auto-pay
exports.configureAutoPay = (0, errors_1.asyncHandler)(async (req, res) => {
    const investment = await Investment_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!investment)
        throw new errors_1.NotFoundError('Investment not found');
    const { autoPay, autoPayAmount, autoPayInterval, autoPayBankAccount } = req.body;
    // Validate bank account belongs to user
    if (autoPayBankAccount) {
        const bankAcc = await BankAccount_1.default.findOne({ _id: autoPayBankAccount, user: req.userId, isActive: true });
        if (!bankAcc)
            throw new errors_1.AppError('Bank account not found', 404);
    }
    // Calculate next pay date
    let nextPayDate;
    if (autoPay && autoPayInterval) {
        const now = new Date();
        nextPayDate = new Date(now);
        if (autoPayInterval === 'weekly')
            nextPayDate.setDate(nextPayDate.getDate() + 7);
        if (autoPayInterval === 'monthly')
            nextPayDate.setMonth(nextPayDate.getMonth() + 1);
    }
    const updated = await Investment_1.default.findByIdAndUpdate(req.params.id, {
        $set: {
            autoPay: autoPay ?? investment.autoPay,
            autoPayAmount: autoPayAmount ?? investment.autoPayAmount,
            autoPayInterval: autoPayInterval ?? investment.autoPayInterval,
            autoPayBankAccount: autoPayBankAccount ?? investment.autoPayBankAccount,
            ...(nextPayDate ? { nextPayDate } : {}),
        },
    }, { new: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Auto-pay configured', data: updated });
});
// POST /api/investments/:id/pay-now — immediate auto-pay deduction
exports.payNow = (0, errors_1.asyncHandler)(async (req, res) => {
    const investment = await Investment_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!investment)
        throw new errors_1.NotFoundError('Investment not found');
    const amount = req.body.amount || investment.autoPayAmount || investment.sipAmount;
    if (!amount || amount <= 0)
        throw new errors_1.AppError('Payment amount is required', 400);
    const bankAccountId = req.body.bankAccount || investment.autoPayBankAccount;
    if (!bankAccountId)
        throw new errors_1.AppError('No bank account linked. Please configure auto-pay first.', 400);
    const bankAccount = await BankAccount_1.default.findOne({ _id: bankAccountId, user: req.userId, isActive: true });
    if (!bankAccount)
        throw new errors_1.NotFoundError('Bank account not found');
    if (bankAccount.balance < amount)
        throw new errors_1.AppError('Insufficient bank balance', 400);
    const newBalance = bankAccount.balance - amount;
    // Calculate next pay date
    let nextPayDate = new Date();
    if (investment.autoPayInterval === 'weekly')
        nextPayDate.setDate(nextPayDate.getDate() + 7);
    else
        nextPayDate.setMonth(nextPayDate.getMonth() + 1);
    await Promise.all([
        bankAccount.updateOne({ balance: newBalance, lastSynced: new Date() }),
        Transaction_1.default.create({
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
    (0, apiResponse_1.sendSuccess)(res, {
        message: `₹${amount.toLocaleString('en-IN')} invested in ${investment.name}`,
        data: { newBankBalance: newBalance, amountInvested: amount, nextPayDate },
    });
});
//# sourceMappingURL=investmentController.js.map