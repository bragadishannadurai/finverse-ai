"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWelcomeEmail = exports.sendOTPEmail = exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = __importDefault(require("../config/env"));
const logger_1 = __importDefault(require("../utils/logger"));
const transporter = nodemailer_1.default.createTransport({
    host: env_1.default.SMTP_HOST,
    port: env_1.default.SMTP_PORT,
    secure: env_1.default.SMTP_PORT === 465,
    auth: {
        user: env_1.default.SMTP_USER,
        pass: env_1.default.SMTP_PASS,
    },
});
const emailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FinVerse AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #050816; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7C3AED, #00E5FF); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; color: #e2e8f0; }
    .body p { line-height: 1.6; margin: 0 0 16px; }
    .otp-box { background: rgba(0,229,255,0.1); border: 2px solid #00E5FF; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 40px; font-weight: 800; color: #00E5FF; letter-spacing: 8px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7C3AED, #00E5FF); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .footer { background: rgba(255,255,255,0.02); padding: 20px 32px; text-align: center; color: rgba(255,255,255,0.4); font-size: 12px; border-top: 1px solid rgba(255,255,255,0.08); }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💎 FinVerse AI</h1>
      <p>Your AI-powered financial companion</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© 2024 FinVerse AI. All rights reserved.</p>
      <p>If you didn't request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>
`;
const sendVerificationEmail = async (email, name, token) => {
    const verifyUrl = `${env_1.default.CLIENT_URL}/verify-email?token=${token}`;
    const content = `
    <p>Hello ${name}! 👋</p>
    <p>Welcome to <strong>FinVerse AI</strong>! Please verify your email address to get started.</p>
    <p style="text-align: center;">
      <a href="${verifyUrl}" class="btn">Verify Email Address</a>
    </p>
    <p style="color: rgba(255,255,255,0.5); font-size: 12px;">Or copy this link: ${verifyUrl}</p>
    <p style="color: rgba(255,255,255,0.5); font-size: 12px;">This link expires in 24 hours.</p>
  `;
    await sendEmail(email, 'Verify Your FinVerse AI Account', content);
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (email, name, token) => {
    const resetUrl = `${env_1.default.CLIENT_URL}/reset-password?token=${token}`;
    const content = `
    <p>Hello ${name},</p>
    <p>You requested to reset your password. Click the button below to proceed:</p>
    <p style="text-align: center;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </p>
    <p style="color: rgba(255,255,255,0.5); font-size: 12px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
  `;
    await sendEmail(email, 'Reset Your FinVerse AI Password', content);
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendOTPEmail = async (email, name, otp) => {
    const content = `
    <p>Hello ${name},</p>
    <p>Your verification code is:</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <p style="color: rgba(255,255,255,0.5); font-size: 12px;">This code expires in 10 minutes. Do not share it with anyone.</p>
  `;
    await sendEmail(email, 'Your FinVerse AI Verification Code', content);
};
exports.sendOTPEmail = sendOTPEmail;
const sendWelcomeEmail = async (email, name) => {
    const content = `
    <p>Hello ${name}! 🎉</p>
    <p>Your email has been verified! Welcome to <strong>FinVerse AI</strong> — your intelligent financial companion.</p>
    <p>Here's what you can do:</p>
    <ul style="color: #e2e8f0; line-height: 2;">
      <li>📊 Track your income and expenses</li>
      <li>💰 Set and manage budgets</li>
      <li>🎯 Create savings goals</li>
      <li>📈 Monitor your investments</li>
      <li>🤖 Chat with your AI financial advisor</li>
    </ul>
    <p style="text-align: center;">
      <a href="${env_1.default.CLIENT_URL}/dashboard" class="btn">Go to Dashboard</a>
    </p>
  `;
    await sendEmail(email, 'Welcome to FinVerse AI! 🚀', content);
};
exports.sendWelcomeEmail = sendWelcomeEmail;
const sendEmail = async (to, subject, htmlContent) => {
    try {
        await transporter.sendMail({
            from: env_1.default.EMAIL_FROM,
            to,
            subject,
            html: emailTemplate(htmlContent),
        });
        logger_1.default.info(`Email sent to ${to}: ${subject}`);
    }
    catch (error) {
        logger_1.default.error('Email send error:', error);
        if (env_1.default.NODE_ENV === 'production') {
            throw new Error('Failed to send email');
        }
    }
};
//# sourceMappingURL=emailService.js.map