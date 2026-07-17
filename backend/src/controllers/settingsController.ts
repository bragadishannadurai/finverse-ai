import { Request, Response } from 'express';
import Settings from '../models/Settings';
import User from '../models/User';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler, NotFoundError } from '../utils/errors';
import { uploadAvatar as uploadAvatarService } from '../services/uploadService';
import { cacheDel } from '../config/redis';

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  let settings = await Settings.findOne({ user: req.userId });
  if (!settings) {
    settings = await Settings.create({ user: req.userId });
  }
  sendSuccess(res, { data: settings });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await Settings.findOneAndUpdate(
    { user: req.userId },
    { $set: req.body },
    { new: true, runValidators: true, upsert: true }
  );
  sendSuccess(res, { message: 'Settings updated', data: settings });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const allowedFields = ['firstName', 'lastName', 'phone', 'currency', 'timezone', 'language',
    'monthlyIncomeGoal', 'monthlySavingsGoal', 'onboardingCompleted'];

  const updates: Record<string, unknown> = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true, runValidators: true });
  if (!user) throw new NotFoundError('User not found');

  await cacheDel(`user:${req.userId}`);
  sendSuccess(res, { message: 'Profile updated', data: user });
});

export const uploadUserAvatar = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new Error('No file uploaded');

  const uploadResult = await uploadAvatarService(req.file.buffer, req.userId!);

  const user = await User.findByIdAndUpdate(
    req.userId,
    { avatar: uploadResult.url },
    { new: true }
  );

  await cacheDel(`user:${req.userId}`);
  sendSuccess(res, { message: 'Avatar updated', data: { avatar: uploadResult.url, user } });
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  await User.findByIdAndUpdate(req.userId, { isActive: false });
  await cacheDel(`user:${req.userId}`);
  sendSuccess(res, { message: 'Account deactivated. Contact support to restore.' });
});
