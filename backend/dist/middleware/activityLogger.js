"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = void 0;
const ActivityLog_1 = __importDefault(require("../models/ActivityLog"));
const logger_1 = __importDefault(require("../utils/logger"));
const mongoose_1 = __importDefault(require("mongoose"));
const logActivity = (action, resource) => {
    return async (req, _res, next) => {
        try {
            if (req.userId) {
                const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const resourceId = rawId && mongoose_1.default.isValidObjectId(rawId)
                    ? new mongoose_1.default.Types.ObjectId(rawId)
                    : undefined;
                await ActivityLog_1.default.create({
                    user: req.userId,
                    action,
                    resource,
                    resourceId,
                    details: {
                        method: req.method,
                        path: req.path,
                        query: req.query,
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    status: 'success',
                });
            }
        }
        catch (err) {
            logger_1.default.error('Activity log error:', err);
        }
        next();
    };
};
exports.logActivity = logActivity;
//# sourceMappingURL=activityLogger.js.map