"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.get('/verify-email', authController_1.verifyEmail);
router.post('/forgot-password', authController_1.forgotPassword);
router.post('/reset-password', authController_1.resetPassword);
router.post('/send-otp', authController_1.sendOTP);
router.post('/verify-otp', authController_1.verifyOTP);
router.post('/refresh', authController_1.refreshToken);
// Protected routes
router.use(auth_1.authenticate);
router.post('/logout', authController_1.logout);
router.get('/me', authController_1.getMe);
// 2FA routes
router.post('/2fa/enable', authController_1.enableTwoFactor);
router.post('/2fa/verify', authController_1.verifyTwoFactor);
router.post('/2fa/disable', authController_1.disableTwoFactor);
exports.default = router;
//# sourceMappingURL=auth.js.map