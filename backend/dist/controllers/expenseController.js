"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadExpenseReceipt = exports.getExpenseSummary = exports.deleteExpense = exports.updateExpense = exports.createExpense = exports.getExpense = exports.getExpenses = void 0;
const Expense_1 = __importDefault(require("../models/Expense"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const BankAccount_1 = __importDefault(require("../models/BankAccount"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const redis_1 = require("../config/redis");
const uploadService_1 = require("../services/uploadService");
const aiService_1 = require("../services/aiService");
const Receipt_1 = __importDefault(require("../models/Receipt"));
const buildExpenseFilter = (userId, query) => {
    const filter = { user: userId };
    if (query.category)
        filter.category = query.category;
    if (query.paymentMethod)
        filter.paymentMethod = query.paymentMethod;
    if (query.isRecurring !== undefined)
        filter.isRecurring = query.isRecurring === 'true';
    if (query.startDate || query.endDate) {
        filter.date = {};
        if (query.startDate)
            filter.date['$gte'] = new Date(query.startDate);
        if (query.endDate)
            filter.date['$lte'] = new Date(query.endDate);
    }
    if (query.minAmount || query.maxAmount) {
        filter.amount = {};
        if (query.minAmount)
            filter.amount['$gte'] = Number(query.minAmount);
        if (query.maxAmount)
            filter.amount['$lte'] = Number(query.maxAmount);
    }
    if (query.search) {
        filter['$text'] = { $search: query.search };
    }
    if (query.tags) {
        filter.tags = { $in: query.tags.split(',') };
    }
    return filter;
};
// GET /api/expenses
exports.getExpenses = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const filter = buildExpenseFilter(req.userId, req.query);
    const [expenses, total] = await Promise.all([
        Expense_1.default.find(filter)
            .populate('category', 'name icon color')
            .populate('bankAccount', 'bankName accountNumber accountType color icon')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean(),
        Expense_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.sendSuccess)(res, {
        data: expenses,
        meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }),
    });
});
// GET /api/expenses/:id
exports.getExpense = (0, errors_1.asyncHandler)(async (req, res) => {
    const expense = await Expense_1.default.findOne({ _id: req.params.id, user: req.userId })
        .populate('category', 'name icon color')
        .populate('bankAccount', 'bankName accountNumber accountType color icon');
    if (!expense)
        throw new errors_1.NotFoundError('Expense not found');
    (0, apiResponse_1.sendSuccess)(res, { data: expense });
});
// POST /api/expenses
exports.createExpense = (0, errors_1.asyncHandler)(async (req, res) => {
    const expense = await Expense_1.default.create({ ...req.body, user: req.userId });
    // ── Auto-debit linked bank account ──────────────────────────────────────
    let bankBalance;
    if (expense.bankAccount) {
        const bankAcc = await BankAccount_1.default.findOne({ _id: expense.bankAccount, user: req.userId, isActive: true });
        if (bankAcc) {
            bankBalance = Math.max(0, bankAcc.balance - expense.amount);
            await Promise.all([
                bankAcc.updateOne({ balance: bankBalance, lastSynced: new Date() }),
                Transaction_1.default.create({
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
    }
    else {
        // Create generic transaction (no bank account link)
        await Transaction_1.default.create({
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
    await (0, redis_1.cacheDel)(`dashboard:${req.userId}`);
    (0, apiResponse_1.sendCreated)(res, {
        message: 'Expense created successfully',
        data: await expense.populate([
            { path: 'category', select: 'name icon color' },
            { path: 'bankAccount', select: 'bankName accountNumber accountType color icon' },
        ]),
    });
});
// PUT /api/expenses/:id
exports.updateExpense = (0, errors_1.asyncHandler)(async (req, res) => {
    const expense = await Expense_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!expense)
        throw new errors_1.NotFoundError('Expense not found');
    const oldAmount = expense.amount;
    const oldBankAccountId = expense.bankAccount?.toString();
    const newAmount = req.body.amount ?? oldAmount;
    const newBankAccountId = req.body.bankAccount ?? oldBankAccountId;
    // Adjust bank balance if amount or bank account changed
    if (oldBankAccountId || newBankAccountId) {
        // Refund old bank account if it existed
        if (oldBankAccountId) {
            const oldBank = await BankAccount_1.default.findOne({ _id: oldBankAccountId, user: req.userId, isActive: true });
            if (oldBank) {
                await oldBank.updateOne({ balance: oldBank.balance + oldAmount, lastSynced: new Date() });
            }
        }
        // Debit new bank account
        if (newBankAccountId) {
            const newBank = await BankAccount_1.default.findOne({ _id: newBankAccountId, user: req.userId, isActive: true });
            if (newBank) {
                const newBalance = Math.max(0, newBank.balance - newAmount);
                await newBank.updateOne({ balance: newBalance, lastSynced: new Date() });
                // Update linked transaction balance
                await Transaction_1.default.findOneAndUpdate({ expenseId: expense._id }, { amount: newAmount, bankAccount: newBankAccountId, balance: newBalance });
            }
        }
    }
    else if (newAmount !== oldAmount) {
        // No bank account, just update transaction amount
        await Transaction_1.default.findOneAndUpdate({ expenseId: expense._id }, { amount: newAmount });
    }
    const updated = await Expense_1.default.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate('category', 'name icon color').populate('bankAccount', 'bankName accountNumber accountType color icon');
    await (0, redis_1.cacheDel)(`dashboard:${req.userId}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Expense updated', data: updated });
});
// DELETE /api/expenses/:id
exports.deleteExpense = (0, errors_1.asyncHandler)(async (req, res) => {
    const expense = await Expense_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!expense)
        throw new errors_1.NotFoundError('Expense not found');
    // ── Refund bank account if expense was linked ────────────────────────────
    if (expense.bankAccount) {
        const bankAcc = await BankAccount_1.default.findOne({ _id: expense.bankAccount, user: req.userId, isActive: true });
        if (bankAcc) {
            await bankAcc.updateOne({ balance: bankAcc.balance + expense.amount, lastSynced: new Date() });
        }
    }
    await expense.deleteOne();
    await Transaction_1.default.deleteOne({ expenseId: expense._id });
    await (0, redis_1.cacheDel)(`dashboard:${req.userId}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Expense deleted successfully' });
});
// GET /api/expenses/stats/summary
exports.getExpenseSummary = (0, errors_1.asyncHandler)(async (req, res) => {
    const cacheKey = `expense:summary:${req.userId}:${req.query.month}`;
    const cached = await (0, redis_1.cacheGet)(cacheKey);
    if (cached)
        return (0, apiResponse_1.sendSuccess)(res, { data: cached });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const [summary, byCategory] = await Promise.all([
        Expense_1.default.aggregate([
            { $match: { user: req.user._id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
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
        Expense_1.default.aggregate([
            { $match: { user: req.user._id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
            { $unwind: '$category' },
            { $project: { category: { name: 1, icon: 1, color: 1 }, total: 1, count: 1 } },
        ]),
    ]);
    const data = { summary: summary[0] || {}, byCategory };
    await (0, redis_1.cacheSet)(cacheKey, data, 1800);
    (0, apiResponse_1.sendSuccess)(res, { data });
});
// POST /api/expenses/:id/receipt
exports.uploadExpenseReceipt = (0, errors_1.asyncHandler)(async (req, res) => {
    const expense = await Expense_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!expense)
        throw new errors_1.NotFoundError('Expense not found');
    if (!req.file)
        throw new Error('No file uploaded');
    const uploadResult = await (0, uploadService_1.uploadReceipt)(req.file.buffer, req.userId);
    // OCR with AI
    let ocrData = {};
    try {
        ocrData = await (0, aiService_1.analyzeReceiptWithAI)(uploadResult.url);
    }
    catch { /* OCR failed, continue */ }
    const receipt = await Receipt_1.default.create({
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
    (0, apiResponse_1.sendSuccess)(res, { message: 'Receipt uploaded and analyzed', data: receipt });
});
//# sourceMappingURL=expenseController.js.map