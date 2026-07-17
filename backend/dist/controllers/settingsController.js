"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.uploadUserAvatar = exports.updateProfile = exports.updateSettings = exports.getSettings = void 0;
const Settings_1 = __importDefault(require("../models/Settings"));
const User_1 = __importDefault(require("../models/User"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const uploadService_1 = require("../services/uploadService");
const redis_1 = require("../config/redis");
exports.getSettings = (0, errors_1.asyncHandler)(async (req, res) => {
    let settings = await Settings_1.default.findOne({ user: req.userId });
    if (!settings) {
        settings = await Settings_1.default.create({ user: req.userId });
    }
    (0, apiResponse_1.sendSuccess)(res, { data: settings });
});
exports.updateSettings = (0, errors_1.asyncHandler)(async (req, res) => {
    const settings = await Settings_1.default.findOneAndUpdate({ user: req.userId }, { $set: req.body }, { new: true, runValidators: true, upsert: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Settings updated', data: settings });
});
exports.updateProfile = (0, errors_1.asyncHandler)(async (req, res) => {
    const allowedFields = ['firstName', 'lastName', 'phone', 'currency', 'timezone', 'language',
        'monthlyIncomeGoal', 'monthlySavingsGoal', 'onboardingCompleted'];
    const updates = {};
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            updates[field] = req.body[field];
        }
    });
    const user = await User_1.default.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
    if (!user)
        throw new errors_1.NotFoundError('User not found');
    await (0, redis_1.cacheDel)(`user:${req.userId}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Profile updated', data: user });
});
exports.uploadUserAvatar = (0, errors_1.asyncHandler)(async (req, res) => {
    if (!req.file)
        throw new Error('No file uploaded');
    const uploadResult = await (0, uploadService_1.uploadAvatar)(req.file.buffer, req.userId);
    const user = await User_1.default.findByIdAndUpdate(req.userId, { avatar: uploadResult.url }, { new: true });
    await (0, redis_1.cacheDel)(`user:${req.userId}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Avatar updated', data: { avatar: uploadResult.url, user } });
});
exports.deleteAccount = (0, errors_1.asyncHandler)(async (req, res) => {
    await User_1.default.findByIdAndUpdate(req.userId, { isActive: false });
    await (0, redis_1.cacheDel)(`user:${req.userId}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Account deactivated. Contact support to restore.' });
});
//# sourceMappingURL=settingsController.js.map