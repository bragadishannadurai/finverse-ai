import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import User from '../models/User';
import Settings from '../models/Settings';
import { generateTokens, generateEmailToken, generateOTP, hashToken } from '../services/tokenService';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendWelcomeEmail,
} from '../services/emailService';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { AppError, ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';
import { asyncHandler } from '../utils/errors';
import { cacheSet, cacheDel } from '../config/redis';
import config from '../config/env';
import { verifyRefreshToken } from '../services/tokenService';
import { seedUserCategories } from './categoryController';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  const verificationToken = generateEmailToken();
  const hashedToken = hashToken(verificationToken);

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    isEmailVerified: config.NODE_ENV !== 'production',
    emailVerificationToken: hashedToken,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  // Create default settings
  await Settings.create({ user: user._id });

  // Seed default categories
  await seedUserCategories(user._id.toString());

  // Send verification email
  await sendVerificationEmail(email, firstName, verificationToken);

  sendCreated(res, {
    message: 'Registration successful! Please check your email to verify your account.',
    data: { email: user.email, userId: user._id },
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, totpCode } = req.body;

  const user = await User.findOne({ email }).select(
    '+password +twoFactorSecret +twoFactorEnabled +refreshToken +loginAttempts +lockUntil'
  );

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.isLocked()) {
    throw new UnauthorizedError('Account is temporarily locked. Try again after 30 minutes.');
  }

  if (!user.password) {
    throw new UnauthorizedError('Please sign in with Google or reset your password');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await user.incrementLoginAttempts();
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isEmailVerified) {
    throw new UnauthorizedError('Please verify your email before logging in');
  }

  // 2FA check
  if (user.twoFactorEnabled) {
    if (!totpCode) {
      return sendSuccess(res, {
        message: '2FA verification required',
        data: { requiresTwoFactor: true, userId: user._id },
      });
    }
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: totpCode,
      window: 2,
    });
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA code');
    }
  }

  // Reset login attempts
  await user.updateOne({ $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockUntil: 1 } });

  const { accessToken, refreshToken } = generateTokens(user);
  await user.updateOne({ refreshToken });

  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
  res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

  sendSuccess(res, {
    message: 'Login successful',
    data: {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      accessToken,
    },
  });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.userId) {
    await User.findByIdAndUpdate(req.userId, { $unset: { refreshToken: 1 } });
    await cacheDel(`user:${req.userId}`);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  sendSuccess(res, { message: 'Logged out successfully' });
});

// POST /api/auth/refresh
export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) throw new UnauthorizedError('Refresh token required');

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
  await user.updateOne({ refreshToken: newRefreshToken });

  res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
  res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

  sendSuccess(res, { message: 'Token refreshed', data: { accessToken } });
});

// GET /api/auth/verify-email
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;
  if (!token) throw new AppError('Verification token required', 400);

  const hashedToken = hashToken(token as string);
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) throw new AppError('Invalid or expired verification token', 400);

  await user.updateOne({
    isEmailVerified: true,
    $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 },
  });

  await sendWelcomeEmail(user.email, user.firstName);

  sendSuccess(res, { message: 'Email verified successfully! You can now log in.' });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Don't reveal if user exists
  if (user) {
    const resetToken = generateEmailToken();
    const hashedToken = hashToken(resetToken);
    await user.updateOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });
    await sendPasswordResetEmail(email, user.firstName, resetToken);
  }

  sendSuccess(res, {
    message: 'If an account exists with this email, you will receive a password reset link.',
  });
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw new AppError('Invalid or expired reset token', 400);

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  await cacheDel(`user:${user._id}`);

  sendSuccess(res, { message: 'Password reset successful. You can now log in.' });
});

// POST /api/auth/send-otp
export const sendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError('User not found');

  const otp = generateOTP();
  await user.updateOne({
    otpCode: hashToken(otp),
    otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
  });

  await sendOTPEmail(email, user.firstName, otp);
  sendSuccess(res, { message: 'OTP sent to your email' });
});

// POST /api/auth/verify-otp
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const hashedOtp = hashToken(otp);

  const user = await User.findOne({ email }).select('+otpCode +otpExpires');
  if (!user || user.otpCode !== hashedOtp || !user.otpExpires || user.otpExpires < new Date()) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  await user.updateOne({ $unset: { otpCode: 1, otpExpires: 1 } });
  sendSuccess(res, { message: 'OTP verified successfully' });
});

// POST /api/auth/2fa/enable
export const enableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const secret = speakeasy.generateSecret({
    name: `${config.TWO_FACTOR_APP_NAME}:${user.email}`,
    length: 32,
  });

  await User.findByIdAndUpdate(user._id, { twoFactorSecret: secret.base32 });

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

  sendSuccess(res, {
    message: '2FA secret generated. Scan the QR code with your authenticator app.',
    data: { secret: secret.base32, qrCode: qrCodeUrl },
  });
});

// POST /api/auth/2fa/verify
export const verifyTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const user = await User.findById(req.userId).select('+twoFactorSecret');

  if (!user || !user.twoFactorSecret) {
    throw new AppError('2FA setup not initiated', 400);
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!isValid) throw new AppError('Invalid authenticator code', 400);

  await user.updateOne({ twoFactorEnabled: true });
  await cacheDel(`user:${user._id}`);

  sendSuccess(res, { message: '2FA enabled successfully' });
});

// POST /api/auth/2fa/disable
export const disableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;
  const user = await User.findById(req.userId).select('+twoFactorSecret');

  if (!user || !user.twoFactorSecret) {
    throw new AppError('2FA is not enabled', 400);
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
    window: 2,
  });

  if (!isValid) throw new AppError('Invalid authenticator code', 400);

  await user.updateOne({ twoFactorEnabled: false, $unset: { twoFactorSecret: 1 } });
  await cacheDel(`user:${user._id}`);

  sendSuccess(res, { message: '2FA disabled successfully' });
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) throw new NotFoundError('User not found');
  sendSuccess(res, { data: user });
});
