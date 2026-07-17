"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../config/env"));
const User_1 = __importDefault(require("../models/User"));
const errors_1 = require("../utils/errors");
const redis_1 = require("../config/redis");
const authenticate = async (req, _res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        else if (req.cookies?.accessToken) {
            token = req.cookies.accessToken;
        }
        if (!token) {
            throw new errors_1.UnauthorizedError('Access token is required');
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, env_1.default.JWT_SECRET);
        }
        catch (err) {
            if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new errors_1.UnauthorizedError('Access token expired');
            }
            throw new errors_1.UnauthorizedError('Invalid access token');
        }
        // Try cache first
        const cacheKey = `user:${decoded.userId}`;
        let user = await (0, redis_1.cacheGet)(cacheKey);
        if (!user) {
            user = await User_1.default.findById(decoded.userId).select('+refreshToken');
            if (!user)
                throw new errors_1.UnauthorizedError('User not found');
            await (0, redis_1.cacheSet)(cacheKey, user, 300); // 5 min cache
        }
        if (!user.isActive) {
            throw new errors_1.ForbiddenError('Account has been deactivated');
        }
        if (user.isLocked()) {
            throw new errors_1.ForbiddenError('Account is temporarily locked');
        }
        req.user = user;
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        if (!roles.includes(req.user.role)) {
            return next(new errors_1.ForbiddenError('Insufficient permissions'));
        }
        next();
    };
};
exports.authorize = authorize;
const optionalAuth = async (req, _res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        if (!token)
            return next();
        const decoded = jsonwebtoken_1.default.verify(token, env_1.default.JWT_SECRET);
        const user = await User_1.default.findById(decoded.userId);
        if (user) {
            req.user = user;
            req.userId = decoded.userId;
        }
        next();
    }
    catch {
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map