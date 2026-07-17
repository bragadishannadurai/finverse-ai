"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.disableTwoFactor = exports.verifyTwoFactor = exports.enableTwoFactor = exports.verifyOTP = exports.sendOTP = exports.resetPassword = exports.forgotPassword = exports.verifyEmail = exports.refreshToken = exports.logout = exports.login = exports.register = void 0;
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
const User_1 = __importDefault(require("../models/User"));
const Settings_1 = __importDefault(require("../models/Settings"));
const tokenService_1 = require("../services/tokenService");
const emailService_1 = require("../services/emailService");
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const errors_2 = require("../utils/errors");
const redis_1 = require("../config/redis");
const env_1 = __importDefault(require("../config/env"));
const tokenService_2 = require("../services/tokenService");
const categoryController_1 = require("./categoryController");
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env_1.default.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
// POST /api/auth/register
exports.register = (0, errors_2.asyncHandler)(async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    const existingUser = await User_1.default.findOne({ email });
    if (existingUser) {
        throw new errors_1.ConflictError('Email already registered');
    }
    const verificationToken = (0, tokenService_1.generateEmailToken)();
    const hashedToken = (0, tokenService_1.hashToken)(verificationToken);
    const user = await User_1.default.create({
        firstName,
        lastName,
        email,
        password,
        isEmailVerified: env_1.default.NODE_ENV !== 'production',
        emailVerificationToken: hashedToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    // Create default settings
    await Settings_1.default.create({ user: user._id });
    // Seed default categories
    await (0, categoryController_1.seedUserCategories)(user._id.toString());
    // Send verification email
    await (0, emailService_1.sendVerificationEmail)(email, firstName, verificationToken);
    (0, apiResponse_1.sendCreated)(res, {
        message: 'Registration successful! Please check your email to verify your account.',
        data: { email: user.email, userId: user._id },
    });
});
// POST /api/auth/login
exports.login = (0, errors_2.asyncHandler)(async (req, res) => {
    const { email, password, totpCode } = req.body;
    const user = await User_1.default.findOne({ email }).select('+password +twoFactorSecret +twoFactorEnabled +refreshToken +loginAttempts +lockUntil');
    if (!user) {
        throw new errors_1.UnauthorizedError('Invalid email or password');
    }
    if (user.isLocked()) {
        throw new errors_1.UnauthorizedError('Account is temporarily locked. Try again after 30 minutes.');
    }
    if (!user.password) {
        throw new errors_1.UnauthorizedError('Please sign in with Google or reset your password');
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        throw new errors_1.UnauthorizedError('Invalid email or password');
    }
    if (!user.isEmailVerified) {
        throw new errors_1.UnauthorizedError('Please verify your email before logging in');
    }
    // 2FA check
    if (user.twoFactorEnabled) {
        if (!totpCode) {
            return (0, apiResponse_1.sendSuccess)(res, {
                message: '2FA verification required',
                data: { requiresTwoFactor: true, userId: user._id },
            });
        }
        const isValid = speakeasy_1.default.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: totpCode,
            window: 2,
        });
        if (!isValid) {
            throw new errors_1.UnauthorizedError('Invalid 2FA code');
        }
    }
    // Reset login attempts
    await user.updateOne({ $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockUntil: 1 } });
    const { accessToken, refreshToken } = (0, tokenService_1.generateTokens)(user);
    await user.updateOne({ refreshToken });
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    (0, apiResponse_1.sendSuccess)(res, {
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
exports.logout = (0, errors_2.asyncHandler)(async (req, res) => {
    if (req.userId) {
        await User_1.default.findByIdAndUpdate(req.userId, { $unset: { refreshToken: 1 } });
        await (0, redis_1.cacheDel)(`user:${req.userId}`);
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    (0, apiResponse_1.sendSuccess)(res, { message: 'Logged out successfully' });
});
// POST /api/auth/refresh
exports.refreshToken = (0, errors_2.asyncHandler)(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token)
        throw new errors_1.UnauthorizedError('Refresh token required');
    let decoded;
    try {
        decoded = (0, tokenService_2.verifyRefreshToken)(token);
    }
    catch {
        throw new errors_1.UnauthorizedError('Invalid or expired refresh token');
    }
    const user = await User_1.default.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
        throw new errors_1.UnauthorizedError('Invalid refresh token');
    }
    const { accessToken, refreshToken: newRefreshToken } = (0, tokenService_1.generateTokens)(user);
    await user.updateOne({ refreshToken: newRefreshToken });
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
    (0, apiResponse_1.sendSuccess)(res, { message: 'Token refreshed', data: { accessToken } });
});
// GET /api/auth/verify-email
exports.verifyEmail = (0, errors_2.asyncHandler)(async (req, res) => {
    const { token } = req.query;
    if (!token)
        throw new errors_1.AppError('Verification token required', 400);
    const hashedToken = (0, tokenService_1.hashToken)(token);
    const user = await User_1.default.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');
    if (!user)
        throw new errors_1.AppError('Invalid or expired verification token', 400);
    await user.updateOne({
        isEmailVerified: true,
        $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 },
    });
    await (0, emailService_1.sendWelcomeEmail)(user.email, user.firstName);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Email verified successfully! You can now log in.' });
});
// POST /api/auth/forgot-password
exports.forgotPassword = (0, errors_2.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    const user = await User_1.default.findOne({ email });
    // Don't reveal if user exists
    if (user) {
        const resetToken = (0, tokenService_1.generateEmailToken)();
        const hashedToken = (0, tokenService_1.hashToken)(resetToken);
        await user.updateOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        });
        await (0, emailService_1.sendPasswordResetEmail)(email, user.firstName, resetToken);
    }
    (0, apiResponse_1.sendSuccess)(res, {
        message: 'If an account exists with this email, you will receive a password reset link.',
    });
});
// POST /api/auth/reset-password
exports.resetPassword = (0, errors_2.asyncHandler)(async (req, res) => {
    const { token, password } = req.body;
    const hashedToken = (0, tokenService_1.hashToken)(token);
    const user = await User_1.default.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');
    if (!user)
        throw new errors_1.AppError('Invalid or expired reset token', 400);
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
    await (0, redis_1.cacheDel)(`user:${user._id}`);
    (0, apiResponse_1.sendSuccess)(res, { message: 'Password reset successful. You can now log in.' });
});
// POST /api/auth/send-otp
exports.sendOTP = (0, errors_2.asyncHandler)(async (req, res) => {
    const { email } = req.body;
    const user = await User_1.default.findOne({ email });
    if (!user)
        throw new errors_1.NotFoundError('User not found');
    const otp = (0, tokenService_1.generateOTP)();
    await user.updateOne({
        otpCode: (0, tokenService_1.hashToken)(otp),
        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });
    await (0, emailService_1.sendOTPEmail)(email, user.firstName, otp);
    (0, apiResponse_1.sendSuccess)(res, { message: 'OTP sent to your email' });
});
// POST /api/auth/verify-otp
exports.verifyOTP = (0, errors_2.asyncHandler)(async (req, res) => {
    const { email, otp } = req.body;
    const hashedOtp = (0, tokenService_1.hashToken)(otp);
    const user = await User_1.default.findOne({ email }).select('+otpCode +otpExpires');
    if (!user || user.otpCode !== hashedOtp || !user.otpExpires || user.otpExpires < new Date()) {
        throw new errors_1.AppError('Invalid or expired OTP', 400);
    }
    await user.updateOne({ $unset: { otpCode: 1, otpExpires: 1 } });
    (0, apiResponse_1.sendSuccess)(res, { message: 'OTP verified successfully' });
});
// POST /api/auth/2fa/enable
exports.enableTwoFactor = (0, errors_2.asyncHandler)(async (req, res) => {
    const user = req.user;
    const secret = speakeasy_1.default.generateSecret({
        name: `${env_1.default.TWO_FACTOR_APP_NAME}:${user.email}`,
        length: 32,
    });
    await User_1.default.findByIdAndUpdate(user._id, { twoFactorSecret: secret.base32 });
    const qrCodeUrl = await qrcode_1.default.toDataURL(secret.otpauth_url);
    (0, apiResponse_1.sendSuccess)(res, {
        message: '2FA secret generated. Scan the QR code with your authenticator app.',
        data: { secret: secret.base32, qrCode: qrCodeUrl },
    });
});
// POST /api/auth/2fa/verify
exports.verifyTwoFactor = (0, errors_2.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    const user = await User_1.default.findById(req.userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) {
        throw new errors_1.AppError('2FA setup not initiated', 400);
    }
    const isValid = speakeasy_1.default.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2,
    });
    if (!isValid)
        throw new errors_1.AppError('Invalid authenticator code', 400);
    await user.updateOne({ twoFactorEnabled: true });
    await (0, redis_1.cacheDel)(`user:${user._id}`);
    (0, apiResponse_1.sendSuccess)(res, { message: '2FA enabled successfully' });
});
// POST /api/auth/2fa/disable
exports.disableTwoFactor = (0, errors_2.asyncHandler)(async (req, res) => {
    const { token } = req.body;
    const user = await User_1.default.findById(req.userId).select('+twoFactorSecret');
    if (!user || !user.twoFactorSecret) {
        throw new errors_1.AppError('2FA is not enabled', 400);
    }
    const isValid = speakeasy_1.default.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2,
    });
    if (!isValid)
        throw new errors_1.AppError('Invalid authenticator code', 400);
    await user.updateOne({ twoFactorEnabled: false, $unset: { twoFactorSecret: 1 } });
    await (0, redis_1.cacheDel)(`user:${user._id}`);
    (0, apiResponse_1.sendSuccess)(res, { message: '2FA disabled successfully' });
});
// GET /api/auth/me
exports.getMe = (0, errors_2.asyncHandler)(async (req, res) => {
    const user = await User_1.default.findById(req.userId);
    if (!user)
        throw new errors_1.NotFoundError('User not found');
    (0, apiResponse_1.sendSuccess)(res, { data: user });
});
//# sourceMappingURL=authController.js.map