"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransactionStats = exports.getTransaction = exports.getTransactions = void 0;
const Transaction_1 = __importDefault(require("../models/Transaction"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
exports.getTransactions = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = { user: req.userId };
    if (req.query.type)
        filter.type = req.query.type;
    if (req.query.status)
        filter.status = req.query.status;
    if (req.query.paymentMethod)
        filter.paymentMethod = req.query.paymentMethod;
    if (req.query.startDate || req.query.endDate) {
        filter.date = {};
        if (req.query.startDate)
            filter.date['$gte'] = new Date(req.query.startDate);
        if (req.query.endDate)
            filter.date['$lte'] = new Date(req.query.endDate);
    }
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const [transactions, total] = await Promise.all([
        Transaction_1.default.find(filter)
            .populate('category', 'name icon color')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit)
            .lean(),
        Transaction_1.default.countDocuments(filter),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: transactions, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
exports.getTransaction = (0, errors_1.asyncHandler)(async (req, res) => {
    const transaction = await Transaction_1.default.findOne({ _id: req.params.id, user: req.userId })
        .populate('category', 'name icon color');
    if (!transaction)
        throw new errors_1.NotFoundError('Transaction not found');
    (0, apiResponse_1.sendSuccess)(res, { data: transaction });
});
exports.getTransactionStats = (0, errors_1.asyncHandler)(async (req, res) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthly, byType] = await Promise.all([
        Transaction_1.default.aggregate([
            { $match: { user: req.user._id, date: { $gte: startOfMonth } } },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                    avgAmount: { $avg: '$amount' },
                },
            },
        ]),
        Transaction_1.default.aggregate([
            { $match: { user: req.user._id } },
            {
                $group: {
                    _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: { monthly, byType } });
});
//# sourceMappingURL=transactionController.js.map