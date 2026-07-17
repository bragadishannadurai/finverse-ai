"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImage = exports.uploadReceipt = exports.uploadAvatar = exports.uploadImage = void 0;
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const errors_1 = require("../utils/errors");
const logger_1 = __importDefault(require("../utils/logger"));
const uploadImage = async (buffer, folder, options = {}) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.default.uploader.upload_stream({
            folder: `finverse/${folder}`,
            resource_type: 'image',
            quality: 'auto',
            fetch_format: 'auto',
            ...options,
        }, (error, result) => {
            if (error || !result) {
                logger_1.default.error('Cloudinary upload error:', error);
                reject(new errors_1.AppError('File upload failed', 500));
                return;
            }
            resolve({
                url: result.secure_url,
                publicId: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                size: result.bytes,
            });
        });
        uploadStream.end(buffer);
    });
};
exports.uploadImage = uploadImage;
const uploadAvatar = async (buffer, userId) => {
    return (0, exports.uploadImage)(buffer, 'avatars', {
        public_id: `avatar_${userId}`,
        overwrite: true,
        transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
        ],
    });
};
exports.uploadAvatar = uploadAvatar;
const uploadReceipt = async (buffer, userId) => {
    return (0, exports.uploadImage)(buffer, `receipts/${userId}`, {
        transformation: [{ quality: 'auto' }],
    });
};
exports.uploadReceipt = uploadReceipt;
const deleteImage = async (publicId) => {
    try {
        await cloudinary_1.default.uploader.destroy(publicId);
        logger_1.default.info(`Deleted image: ${publicId}`);
    }
    catch (error) {
        logger_1.default.error('Cloudinary delete error:', error);
    }
};
exports.deleteImage = deleteImage;
//# sourceMappingURL=uploadService.js.map