import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/env';
import { IUser } from '../models/User';

export interface TokenPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (user: IUser): string => {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    config.JWT_SECRET as string,
    { expiresIn: config.JWT_EXPIRES_IN } as object
  );
};

export const generateRefreshToken = (user: IUser): string => {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    config.JWT_REFRESH_SECRET as string,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as object
  );
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as TokenPayload;
};

export const generateEmailToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const generateTokens = (user: IUser) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  return { accessToken, refreshToken };
};
