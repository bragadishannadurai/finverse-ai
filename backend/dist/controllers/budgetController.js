"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncBudgetSpending = exports.getBudgetHistory = exports.archiveBudget = exports.deleteBudget = exports.updateBudget = exports.createBudget = exports.getBudget = exports.getBudgets = void 0;
const Budget_1 = __importDefault(require("../models/Budget"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Notification_1 = __importDefault(require("../models/Notification"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const mongoose_1 = __importDefault(require("mongoose"));
exports.getBudgets = (0, errors_1.asyncHandler)(async (req, res) => {
    // Auto-expire budgets past their end date
    await Budget_1.default.updateMany({ user: req.userId, isActive: true, endDate: { $lt: new Date() } }, { $set: { isActive: false } });
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = { user: req.userId, isActive: true };
    if (req.query.period)
        filter.period = req.query.period;
    const [budgets, total] = await Promise.all([
        Budget_1.default.find(filter)
            .populate('category', 'name icon color')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Budget_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: budgets, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
exports.getBudget = (0, errors_1.asyncHandler)(async (req, res) => {
    const budget = await Budget_1.default.findOne({ _id: req.params.id, user: req.userId })
        .populate('category', 'name icon color');
    if (!budget)
        throw new errors_1.NotFoundError('Budget not found');
    (0, apiResponse_1.sendSuccess)(res, { data: budget });
});
exports.createBudget = (0, errors_1.asyncHandler)(async (req, res) => {
    const budget = await Budget_1.default.create({ ...req.body, user: req.userId });
    (0, apiResponse_1.sendCreated)(res, {
        message: 'Budget created successfully',
        data: await budget.populate('category', 'name icon color'),
    });
});
exports.updateBudget = (0, errors_1.asyncHandler)(async (req, res) => {
    const budget = await Budget_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!budget)
        throw new errors_1.NotFoundError('Budget not found');
    const updated = await Budget_1.default.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate('category', 'name icon color');
    (0, apiResponse_1.sendSuccess)(res, { message: 'Budget updated', data: updated });
});
exports.deleteBudget = (0, errors_1.asyncHandler)(async (req, res) => {
    const budget = await Budget_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!budget)
        throw new errors_1.NotFoundError('Budget not found');
    await budget.deleteOne();
    (0, apiResponse_1.sendSuccess)(res, { message: 'Budget deleted successfully' });
});
// PATCH /api/budgets/:id/archive — manually move to history
exports.archiveBudget = (0, errors_1.asyncHandler)(async (req, res) => {
    const budget = await Budget_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!budget)
        throw new errors_1.NotFoundError('Budget not found');
    await budget.updateOne({ isActive: false });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Budget archived', data: { _id: budget._id } });
});
// GET /api/budgets/history — expired / archived budgets
exports.getBudgetHistory = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const [budgets, total] = await Promise.all([
        Budget_1.default.find({ user: req.userId, isActive: false })
            .populate('category', 'name icon color')
            .sort({ endDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Budget_1.default.countDocuments({ user: req.userId, isActive: false }),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: budgets, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
// Recalculate budget spent amounts based on actual expenses
exports.syncBudgetSpending = (0, errors_1.asyncHandler)(async (req, res) => {
    const budgets = await Budget_1.default.find({ user: req.userId, isActive: true });
    for (const budget of budgets) {
        const totalSpent = await Expense_1.default.aggregate([
            {
                $match: {
                    user: new mongoose_1.default.Types.ObjectId(req.userId),
                    category: budget.category,
                    date: { $gte: budget.startDate, $lte: budget.endDate },
                },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const spent = totalSpent[0]?.total || 0;
        await budget.updateOne({ spent });
        // Send budget alert notification if threshold crossed
        const percentage = (spent / budget.amount) * 100;
        if (percentage >= budget.alertAt && !budget.isAlertSent) {
            await Notification_1.default.create({
                user: req.userId,
                type: 'budget_alert',
                title: `Budget Alert: ${budget.name}`,
                message: `You've used ${Math.round(percentage)}% of your ${budget.name} budget (₹${spent.toLocaleString('en-IN')} of ₹${budget.amount.toLocaleString('en-IN')})`,
                priority: percentage >= 100 ? 'critical' : 'high',
                icon: '⚠️',
            });
            await budget.updateOne({ isAlertSent: true });
        }
    }
    (0, apiResponse_1.sendSuccess)(res, { message: 'Budget spending synced successfully' });
});
//# sourceMappingURL=budgetController.js.map