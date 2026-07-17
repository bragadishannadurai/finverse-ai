import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import User, { IUser } from '../models/User';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { cacheGet, cacheSet } from '../config/redis';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

interface JWTPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new UnauthorizedError('Access token is required');
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }

    // Try cache first
    const cacheKey = `user:${decoded.userId}`;
    let user = await cacheGet<IUser>(cacheKey);

    if (!user) {
      user = await User.findById(decoded.userId).select('+refreshToken');
      if (!user) throw new UnauthorizedError('User not found');
      await cacheSet(cacheKey, user, 300); // 5 min cache
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated');
    }

    if (user.isLocked()) {
      throw new ForbiddenError('Account is temporarily locked');
    }

    req.user = user as IUser;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token) return next();

    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    const user = await User.findById(decoded.userId);
    if (user) {
      req.user = user;
      req.userId = decoded.userId;
    }
    next();
  } catch {
    next();
  }
};
