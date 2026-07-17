import { createClient, RedisClientType } from 'redis';
import config from './env';
import logger from '../utils/logger';

let redisClient: RedisClientType | null = null;
let isConnected = false;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({ url: config.REDIS_URL }) as RedisClientType;

    redisClient.on('connect', () => {
      logger.info('Redis connecting...');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      logger.info('Redis connected and ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
      isConnected = false;
    });

    redisClient.on('end', () => {
      isConnected = false;
      logger.warn('Redis connection closed');
    });

    redisClient.connect().catch((err) => {
      logger.error('Redis connection promise error:', err);
    });
  } catch (error) {
    logger.error('Redis connection failed:', error);
    // Non-fatal: app can run without Redis (caching disabled)
    isConnected = false;
  }
};

export const getRedis = (): RedisClientType | null => redisClient;

export const isRedisConnected = (): boolean => isConnected;

export const cacheSet = async (
  key: string,
  value: unknown,
  ttlSeconds = 3600
): Promise<void> => {
  if (!redisClient || !isConnected) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (err) {
    logger.error('Redis SET error:', err);
  }
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redisClient || !isConnected) return null;
  try {
    const data = await redisClient.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch (err) {
    logger.error('Redis GET error:', err);
    return null;
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  if (!redisClient || !isConnected) return;
  try {
    await redisClient.del(key);
  } catch (err) {
    logger.error('Redis DEL error:', err);
  }
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  if (!redisClient || !isConnected) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    logger.error('Redis DEL pattern error:', err);
  }
};
