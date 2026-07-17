"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = exports.uploadDocument = exports.uploadImage = void 0;
const multer_1 = __importDefault(require("multer"));
const errors_1 = require("../utils/errors");
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_DOC_TYPES = ['application/pdf', ...ALLOWED_IMAGE_TYPES];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const storage = multer_1.default.memoryStorage();
const imageFileFilter = (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new errors_1.AppError(`Invalid file type. Only ${ALLOWED_IMAGE_TYPES.join(', ')} allowed`, 400));
    }
};
const documentFileFilter = (_req, file, cb) => {
    if (ALLOWED_DOC_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new errors_1.AppError('Invalid file type', 400));
    }
};
exports.uploadImage = (0, multer_1.default)({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
});
exports.uploadDocument = (0, multer_1.default)({
    storage,
    fileFilter: documentFileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
});
exports.uploadAvatar = (0, multer_1.default)({
    storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for avatars
});
//# sourceMappingURL=upload.js.map