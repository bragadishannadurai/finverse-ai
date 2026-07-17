"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaginationParams = exports.paginateMeta = exports.sendCreated = exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, options = {}, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message: options.message || 'Success',
        data: options.data !== undefined ? options.data : null,
        meta: options.meta || undefined,
        timestamp: new Date().toISOString(),
    });
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 500, errors) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors: errors || undefined,
        timestamp: new Date().toISOString(),
    });
};
exports.sendError = sendError;
const sendCreated = (res, options = {}) => {
    return (0, exports.sendSuccess)(res, options, 201);
};
exports.sendCreated = sendCreated;
const paginateMeta = (options) => {
    const { page, limit, total } = options;
    const totalPages = Math.ceil(total / limit);
    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    };
};
exports.paginateMeta = paginateMeta;
const getPaginationParams = (query) => {
    const page = Math.max(1, parseInt(String(query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.getPaginationParams = getPaginationParams;
//# sourceMappingURL=apiResponse.js.map