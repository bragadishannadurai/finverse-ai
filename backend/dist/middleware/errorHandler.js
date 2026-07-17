"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const env_1 = __importDefault(require("../config/env"));
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler = (err, req, res, _next) => {
    logger_1.default.error('Error:', {
        message: err.message,
        stack: env_1.default.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        userId: req.userId,
    });
    // Operational errors
    if (err instanceof errors_1.AppError) {
        const response = {
            success: false,
            message: err.message,
            code: err.code,
            timestamp: new Date().toISOString(),
        };
        if (err instanceof errors_1.ValidationError) {
            response.errors = err.errors;
        }
        res.status(err.statusCode).json(response);
        return;
    }
    // Mongoose validation error
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        const errors = {};
        Object.keys(err.errors).forEach((key) => {
            errors[key] = err.errors[key].message;
        });
        logger_1.default.error('Mongoose Validation Error details:', errors);
        res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors,
            timestamp: new Date().toISOString(),
        });
        return;
    }
    // Mongoose duplicate key error
    const errCode = err.code;
    if (errCode === 11000 || Number(errCode) === 11000) {
        const mongoErr = err;
        const field = Object.keys(mongoErr.keyValue || {})[0];
        res.status(409).json({
            success: false,
            message: `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Resource'} already exists`,
            code: 'DUPLICATE_KEY',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    // Mongoose cast error
    if (err instanceof mongoose_1.default.Error.CastError) {
        res.status(400).json({
            success: false,
            message: `Invalid ${err.path}: ${err.value}`,
            code: 'INVALID_ID',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    // Default internal server error
    res.status(500).json({
        success: false,
        message: env_1.default.NODE_ENV === 'development' ? err.message : 'Internal server error',
        timestamp: new Date().toISOString(),
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
    });
};
exports.notFoundHandler = notFoundHandler;
//# sourceMappingURL=errorHandler.js.map