"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDefaultAccount = exports.withdrawFromAccount = exports.depositToAccount = exports.getAccountTransactions = exports.deleteBankAccount = exports.updateBankAccount = exports.createBankAccount = exports.getBankAccount = exports.getBankAccounts = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const BankAccount_1 = __importDefault(require("../models/BankAccount"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
// ─── GET /api/bank-accounts ───────────────────────────────────────────────────
exports.getBankAccounts = (0, errors_1.asyncHandler)(async (req, res) => {
    const accounts = await BankAccount_1.default.find({ user: req.userId, isActive: true })
        .sort({ isDefault: -1, createdAt: 1 })
        .lean();
    // Compute total balance
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    (0, apiResponse_1.sendSuccess)(res, { data: { accounts, totalBalance } });
});
// ─── GET /api/bank-accounts/:id ──────────────────────────────────────────────
exports.getBankAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const account = await BankAccount_1.default.findOne({ _id: req.params.id, user: req.userId, isActive: true });
    if (!account)
        throw new errors_1.NotFoundError('Bank account not found');
    (0, apiResponse_1.sendSuccess)(res, { data: account });
});
// ─── POST /api/bank-accounts ─────────────────────────────────────────────────
exports.createBankAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const { bankName, accountNumber, accountType, balance, ifscCode, branchName, color, icon, isDefault } = req.body;
    // If setting as default, unset previous default
    if (isDefault) {
        await BankAccount_1.default.updateMany({ user: req.userId }, { isDefault: false });
    }
    // If first account, make it default
    const count = await BankAccount_1.default.countDocuments({ user: req.userId, isActive: true });
    const shouldBeDefault = isDefault || count === 0;
    const account = await BankAccount_1.default.create({
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
        await Transaction_1.default.create({
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
    (0, apiResponse_1.sendCreated)(res, { message: 'Bank account added successfully', data: account });
});
// ─── PUT /api/bank-accounts/:id ──────────────────────────────────────────────
exports.updateBankAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const account = await BankAccount_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!account)
        throw new errors_1.NotFoundError('Bank account not found');
    if (req.body.isDefault) {
        await BankAccount_1.default.updateMany({ user: req.userId }, { isDefault: false });
    }
    const updated = await BankAccount_1.default.findByIdAndUpdate(req.params.id, { $set: { ...req.body, lastSynced: new Date() } }, { new: true, runValidators: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Bank account updated', data: updated });
});
// ─── DELETE /api/bank-accounts/:id ───────────────────────────────────────────
exports.deleteBankAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const account = await BankAccount_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!account)
        throw new errors_1.NotFoundError('Bank account not found');
    await account.updateOne({ isActive: false });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Bank account removed' });
});
// ─── GET /api/bank-accounts/:id/transactions ─────────────────────────────────
exports.getAccountTransactions = (0, errors_1.asyncHandler)(async (req, res) => {
    const account = await BankAccount_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!account)
        throw new errors_1.NotFoundError('Bank account not found');
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = {
        user: req.userId,
        bankAccount: new mongoose_1.default.Types.ObjectId(req.params.id),
    };
    if (req.query.type)
        filter.type = req.query.type;
    const [transactions, total] = await Promise.all([
        Transaction_1.default.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
        Transaction_1.default.countDocuments(filter),
    ]);
    // Compute summary
    const summary = await Transaction_1.default.aggregate([
        { $match: { user: new mongoose_1.default.Types.ObjectId(req.userId), bankAccount: new mongoose_1.default.Types.ObjectId(req.params.id) } },
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
    (0, apiResponse_1.sendSuccess)(res, {
        data: {
            account: { bankName: account.bankName, balance: account.balance, accountType: account.accountType },
            transactions,
            summary: { credits, debits, net: credits - debits },
        },
        meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }),
    });
});
// ─── POST /api/bank-accounts/:id/deposit ─────────────────────────────────────
exports.depositToAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const { amount, description, date } = req.body;
    if (!amount || amount <= 0)
        throw new errors_1.AppError('Valid deposit amount required', 400);
    const account = await BankAccount_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!account)
        throw new errors_1.NotFoundError('Bank account not found');
    const newBalance = account.balance + amount;
    await Promise.all([
        account.updateOne({ balance: newBalance, lastSynced: new Date() }),
        Transaction_1.default.create({
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
    (0, apiResponse_1.sendSuccess)(res, {
        message: `₹${amount.toLocaleString('en-IN')} deposited successfully`,
        data: { newBalance },
    });
});
// ─── POST /api/bank-accounts/:id/withdraw ────────────────────────────────────
exports.withdrawFromAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const { amount, description, date } = req.body;
    if (!amount || amount <= 0)
        throw new errors_1.AppError('Valid withdrawal amount required', 400);
    const account = await BankAccount_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!account)
        throw new errors_1.NotFoundError('Bank account not found');
    if (account.balance < amount)
        throw new errors_1.AppError('Insufficient balance', 400);
    const newBalance = account.balance - amount;
    await Promise.all([
        account.updateOne({ balance: newBalance, lastSynced: new Date() }),
        Transaction_1.default.create({
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
    (0, apiResponse_1.sendSuccess)(res, {
        message: `₹${amount.toLocaleString('en-IN')} withdrawn successfully`,
        data: { newBalance },
    });
});
// ─── POST /api/bank-accounts/:id/set-default ─────────────────────────────────
exports.setDefaultAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    const account = await BankAccount_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!account)
        throw new errors_1.NotFoundError('Bank account not found');
    await BankAccount_1.default.updateMany({ user: req.userId }, { isDefault: false });
    await account.updateOne({ isDefault: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Default account updated' });
});
//# sourceMappingURL=bankAccountController.js.map