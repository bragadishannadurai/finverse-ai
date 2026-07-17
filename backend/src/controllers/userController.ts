import { Request, Response } from 'express';
import User from '../models/User';
import ActivityLog from '../models/ActivityLog';
import { sendSuccess, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError } from '../utils/errors';
import { cacheDel } from '../config/redis';

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) throw new NotFoundError('User not found');
  sendSuccess(res, { data: user });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const allowedFields = [
    'firstName', 'lastName', 'phone', 'currency', 'timezone', 'language',
    'monthlyIncomeGoal', 'monthlySavingsGoal',
  ];

  const updates: Record<string, unknown> = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
  if (!user) throw new NotFoundError('User not found');

  await cacheDel(`user:${req.userId}`);
  sendSuccess(res, { message: 'Profile updated', data: user });
});

export const getActivityLog = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);

  const [logs, total] = await Promise.all([
    ActivityLog.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments({ user: req.userId }),
  ]);

  sendSuccess(res, { data: logs, meta: paginateMeta({ page, limit, total }) });
});
