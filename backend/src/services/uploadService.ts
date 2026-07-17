import cloudinary from '../config/cloudinary';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

export const uploadImage = async (
  buffer: Buffer,
  folder: string,
  options: Record<string, unknown> = {}
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `finverse/${folder}`,
        resource_type: 'image',
        quality: 'auto',
        fetch_format: 'auto',
        ...options,
      },
      (error, result) => {
        if (error || !result) {
          logger.error('Cloudinary upload error:', error);
          reject(new AppError('File upload failed', 500));
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
      }
    );
    uploadStream.end(buffer);
  });
};

export const uploadAvatar = async (
  buffer: Buffer,
  userId: string
): Promise<UploadResult> => {
  return uploadImage(buffer, 'avatars', {
    public_id: `avatar_${userId}`,
    overwrite: true,
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  });
};

export const uploadReceipt = async (
  buffer: Buffer,
  userId: string
): Promise<UploadResult> => {
  return uploadImage(buffer, `receipts/${userId}`, {
    transformation: [{ quality: 'auto' }],
  });
};

export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted image: ${publicId}`);
  } catch (error) {
    logger.error('Cloudinary delete error:', error);
  }
};
