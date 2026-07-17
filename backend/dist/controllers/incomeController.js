"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIncomeSummary = exports.deleteIncome = exports.updateIncome = exports.createIncome = exports.getIncome = exports.getIncomes = void 0;
const Income_1 = __importDefault(require("../models/Income"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const redis_1 = require("../config/redis");
exports.getIncomes = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = { user: req.userId };
    if (req.query.source)
        filter.source = req.query.source;
    if (req.query.isRecurring !== undefined)
        filter.isRecurring = req.query.isRecurring === 'true';
    if (req.query.startDate || req.query.endDate) {
        filter.date = {};
        if (req.query.startDate)
            filter.date['$gte'] = new Date(req.query.startDate);
        if (req.query.endDate)
            filter.date['$lte'] = new Date(req.query.endDate);
    }
    const [incomes, total] = await Promise.all([
        Income_1.default.find(filter)
            .populate('category', 'name icon color')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Income_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: incomes, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
exports.getIncome = (0, errors_1.asyncHandler)(async (req, res) => {
    const income = await Income_1.default.findOne({ _id: req.params.id, user: req.userId })
        .populate('category', 'name icon color');
    if (!income)
        throw new errors_1.NotFoundError('Income not found');
    (0, apiResponse_1.sendSuccess)(res, { data: income });
});
exports.createIncome = (0, errors_1.asyncHandler)(async (req, res) => {
    const income = await Income_1.default.create({ ...req.body, user: req.userId });
    await Transaction_1.default.create({
        user: req.userId,
        type: 'credit',
        amount: income.amount,
        currency: income.currency,
        description: income.title,
        category: income.category,
        incomeId: income._id,
        date: income.date,
        status: 'completed',
    });
    await (0, redis_1.cacheDel)(`dashboard:${req.userId}`);
    (0, apiResponse_1.sendCreated)(res, {
        message: 'Income created successfully',
        data: await income.populate('category', 'name icon color'),
    });
});
exports.updateIncome = (0, errors_1.asyncHandler)(async (req, res) => {
    const income = await Income_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!income)
        throw new errors_1.NotFoundError('Income not found');
    const updated = await Income_1.default.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).populate('category', 'name icon color');
    await (0, redis_1.cacheDel)(`dashboard:${req.userId}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Income updated', data: updated });
});
exports.deleteIncome = (0, errors_1.asyncHandler)(async (req, res) => {
    const income = await Income_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!income)
        throw new errors_1.NotFoundError('Income not found');
    await income.deleteOne();
    await Transaction_1.default.deleteOne({ incomeId: income._id });
    await (0, redis_1.cacheDel)(`dashboard:${req.userId}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Income deleted successfully' });
});
exports.getIncomeSummary = (0, errors_1.asyncHandler)(async (req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [summary, bySource] = await Promise.all([
        Income_1.default.aggregate([
            { $match: { user: req.user._id, date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } },
        ]),
        Income_1.default.aggregate([
            { $match: { user: req.user._id, date: { $gte: startOfMonth } } },
            { $group: { _id: '$source', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } },
        ]),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: { summary: summary[0] || {}, bySource } });
});
//# sourceMappingURL=incomeController.js.map