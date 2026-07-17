"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivityLog = exports.updateProfile = exports.getProfile = void 0;
const User_1 = __importDefault(require("../models/User"));
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const redis_1 = require("../config/redis");
exports.getProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
    if (!user)
        throw new errors_1.NotFoundError('User not found');
    (0, apiResponse_1.sendSuccess)(res, { data: user });
});
exports.updateProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const allowedFields = [
        'firstName', 'lastName', 'phone', 'currency', 'timezone', 'language',
        'monthlyIncomeGoal', 'monthlySavingsGoal',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined)
            updates[field] = req.body[field];
    });
    const user = await User_1.default.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
    if (!user)
        throw new errors_1.NotFoundError('User not found');
    await (0, redis_1.cacheDel)(`user:${req.userId}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Profile updated', data: user });
});
exports.getActivityLog = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const [logs, total] = await Promise.all([
        ActivityLog_1.default.find({ user: req.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ActivityLog_1.default.countDocuments({ user: req.userId }),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: logs, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
//# sourceMappingURL=userController.js.map