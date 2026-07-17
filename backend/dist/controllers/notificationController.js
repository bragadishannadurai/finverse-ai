"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllNotifications = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
exports.getNotifications = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const filter = { user: req.userId, isArchived: false };
    if (req.query.isRead !== undefined)
        filter.isRead = req.query.isRead === 'true';
    if (req.query.type)
        filter.type = req.query.type;
    const [notifications, total, unreadCount] = await Promise.all([
        Notification_1.default.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification_1.default.countDocuments(filter),
        Notification_1.default.countDocuments({ user: req.userId, isRead: false, isArchived: false }),
    ]);
    (0, apiResponse_1.sendSuccess)(res, {
        data: { notifications, unreadCount },
        meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }),
    });
});
exports.markAsRead = (0, errors_1.asyncHandler)(async (req, res) => {
    const notification = await Notification_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!notification)
        throw new errors_1.NotFoundError('Notification not found');
    await notification.updateOne({ isRead: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Notification marked as read' });
});
exports.markAllAsRead = (0, errors_1.asyncHandler)(async (req, res) => {
    await Notification_1.default.updateMany({ user: req.userId, isRead: false }, { isRead: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'All notifications marked as read' });
});
exports.deleteNotification = (0, errors_1.asyncHandler)(async (req, res) => {
    const notification = await Notification_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!notification)
        throw new errors_1.NotFoundError('Notification not found');
    await notification.deleteOne();
    (0, apiResponse_1.sendSuccess)(res, { message: 'Notification deleted' });
});
exports.clearAllNotifications = (0, errors_1.asyncHandler)(async (req, res) => {
    await Notification_1.default.deleteMany({ user: req.userId, isRead: true });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Read notifications cleared' });
});
//# sourceMappingURL=notificationController.js.map