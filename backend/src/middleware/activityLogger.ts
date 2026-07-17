import { Request, Response, NextFunction } from 'express';
import ActivityLog from '../models/ActivityLog';
import logger from '../utils/logger';
import mongoose from 'mongoose';

export const logActivity = (action: string, resource: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.userId) {
        const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const resourceId = rawId && mongoose.isValidObjectId(rawId)
          ? new mongoose.Types.ObjectId(rawId)
          : undefined;

        await ActivityLog.create({
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
    } catch (err) {
      logger.error('Activity log error:', err);
    }
    next();
  };
};
