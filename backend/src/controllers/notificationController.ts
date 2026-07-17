import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { sendSuccess, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError } from '../utils/errors';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);
  const filter: Record<string, unknown> = { user: req.userId, isArchived: false };

  if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true';
  if (req.query.type) filter.type = req.query.type;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.userId, isRead: false, isArchived: false }),
  ]);

  sendSuccess(res, {
    data: { notifications, unreadCount },
    meta: paginateMeta({ page, limit, total }),
  });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.userId });
  if (!notification) throw new NotFoundError('Notification not found');

  await notification.updateOne({ isRead: true });
  sendSuccess(res, { message: 'Notification marked as read' });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ user: req.userId, isRead: false }, { isRead: true });
  sendSuccess(res, { message: 'All notifications marked as read' });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.userId });
  if (!notification) throw new NotFoundError('Notification not found');
  await notification.deleteOne();
  sendSuccess(res, { message: 'Notification deleted' });
});

export const clearAllNotifications = asyncHandler(async (req: Request, res: Response) => {
  await Notification.deleteMany({ user: req.userId, isRead: true });
  sendSuccess(res, { message: 'Read notifications cleared' });
});
