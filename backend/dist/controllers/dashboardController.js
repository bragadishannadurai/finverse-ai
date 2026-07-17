"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNetWorthHistory = exports.getDashboardData = void 0;
const Expense_1 = __importDefault(require("../models/Expense"));
const Income_1 = __importDefault(require("../models/Income"));
const Budget_1 = __importDefault(require("../models/Budget"));
const SavingsGoal_1 = __importDefault(require("../models/SavingsGoal"));
const Investment_1 = __importDefault(require("../models/Investment"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const redis_1 = require("../config/redis");
const mongoose_1 = __importDefault(require("mongoose"));
exports.getDashboardData = (0, errors_1.asyncHandler)(async (req, res) => {
    const cacheKey = `dashboard:${req.userId}`;
    const cached = await (0, redis_1.cacheGet)(cacheKey);
    if (cached)
        return (0, apiResponse_1.sendSuccess)(res, { data: cached });
    const userId = new mongoose_1.default.Types.ObjectId(req.userId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const [monthlyIncome, monthlyExpenses, lastMonthIncome, lastMonthExpenses, investments, savingsGoals, budgets, recentTransactions, expensesByCategory, monthlyTrend,] = await Promise.all([
        // Current month income
        Income_1.default.aggregate([
            { $match: { user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Current month expenses
        Expense_1.default.aggregate([
            { $match: { user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Last month income
        Income_1.default.aggregate([
            { $match: { user: userId, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Last month expenses
        Expense_1.default.aggregate([
            { $match: { user: userId, date: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        // Investments
        Investment_1.default.aggregate([
            { $match: { user: userId, isActive: true } },
            { $group: { _id: null, totalInvested: { $sum: '$investedAmount' }, currentValue: { $sum: '$currentValue' } } },
        ]),
        // Savings goals
        SavingsGoal_1.default.find({ user: userId, isActive: true }).limit(5).lean(),
        // Active budgets
        Budget_1.default.find({ user: userId, isActive: true, endDate: { $gte: now } })
            .populate('category', 'name icon color')
            .limit(5)
            .lean(),
        // Recent transactions
        Transaction_1.default.find({ user: userId })
            .populate('category', 'name icon color')
            .sort({ date: -1 })
            .limit(10)
            .lean(),
        // Expenses by category this month
        Expense_1.default.aggregate([
            { $match: { user: userId, date: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
            { $limit: 8 },
            { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        ]),
        // 6-month income/expense trend
        Expense_1.default.aggregate([
            {
                $match: {
                    user: userId,
                    date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
                },
            },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    expenses: { $sum: '$amount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
    ]);
    const totalIncome = monthlyIncome[0]?.total || 0;
    const totalExpenses = monthlyExpenses[0]?.total || 0;
    const totalInvestments = investments[0]?.currentValue || 0;
    const totalSavings = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const netWorth = totalInvestments + totalSavings;
    const savingsThisMonth = totalIncome - totalExpenses;
    const incomeChange = lastMonthIncome[0]?.total
        ? ((totalIncome - lastMonthIncome[0].total) / lastMonthIncome[0].total) * 100
        : 0;
    const expenseChange = lastMonthExpenses[0]?.total
        ? ((totalExpenses - lastMonthExpenses[0].total) / lastMonthExpenses[0].total) * 100
        : 0;
    const data = {
        overview: {
            totalIncome,
            totalExpenses,
            totalSavings,
            totalInvestments,
            netWorth,
            savingsThisMonth,
            incomeChange: Math.round(incomeChange * 100) / 100,
            expenseChange: Math.round(expenseChange * 100) / 100,
        },
        budgets,
        savingsGoals,
        recentTransactions,
        expensesByCategory,
        monthlyTrend,
        period: { start: startOfMonth, end: endOfMonth },
    };
    await (0, redis_1.cacheSet)(cacheKey, data, 900); // 15 min cache
    (0, apiResponse_1.sendSuccess)(res, { data });
});
exports.getNetWorthHistory = (0, errors_1.asyncHandler)(async (req, res) => {
    const userId = new mongoose_1.default.Types.ObjectId(req.userId);
    const months = parseInt(req.query.months) || 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const [incomeHistory, expenseHistory] = await Promise.all([
        Income_1.default.aggregate([
            { $match: { user: userId, date: { $gte: startDate } } },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    total: { $sum: '$amount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
        Expense_1.default.aggregate([
            { $match: { user: userId, date: { $gte: startDate } } },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' } },
                    total: { $sum: '$amount' },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: { incomeHistory, expenseHistory } });
});
//# sourceMappingURL=dashboardController.js.map