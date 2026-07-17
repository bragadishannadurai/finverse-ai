"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheDelPattern = exports.cacheDel = exports.cacheGet = exports.cacheSet = exports.isRedisConnected = exports.getRedis = exports.connectRedis = void 0;
const redis_1 = require("redis");
const env_1 = __importDefault(require("./env"));
const logger_1 = __importDefault(require("../utils/logger"));
let redisClient = null;
let isConnected = false;
const connectRedis = async () => {
    try {
        redisClient = (0, redis_1.createClient)({ url: env_1.default.REDIS_URL });
        redisClient.on('connect', () => {
            logger_1.default.info('Redis connecting...');
        });
        redisClient.on('ready', () => {
            isConnected = true;
            logger_1.default.info('Redis connected and ready');
        });
        redisClient.on('error', (err) => {
            logger_1.default.error('Redis error:', err);
            isConnected = false;
        });
        redisClient.on('end', () => {
            isConnected = false;
            logger_1.default.warn('Redis connection closed');
        });
        redisClient.connect().catch((err) => {
            logger_1.default.error('Redis connection promise error:', err);
        });
    }
    catch (error) {
        logger_1.default.error('Redis connection failed:', error);
        // Non-fatal: app can run without Redis (caching disabled)
        isConnected = false;
    }
};
exports.connectRedis = connectRedis;
const getRedis = () => redisClient;
exports.getRedis = getRedis;
const isRedisConnected = () => isConnected;
exports.isRedisConnected = isRedisConnected;
const cacheSet = async (key, value, ttlSeconds = 3600) => {
    if (!redisClient || !isConnected)
        return;
    try {
        await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    }
    catch (err) {
        logger_1.default.error('Redis SET error:', err);
    }
};
exports.cacheSet = cacheSet;
const cacheGet = async (key) => {
    if (!redisClient || !isConnected)
        return null;
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (err) {
        logger_1.default.error('Redis GET error:', err);
        return null;
    }
};
exports.cacheGet = cacheGet;
const cacheDel = async (key) => {
    if (!redisClient || !isConnected)
        return;
    try {
        await redisClient.del(key);
    }
    catch (err) {
        logger_1.default.error('Redis DEL error:', err);
    }
};
exports.cacheDel = cacheDel;
const cacheDelPattern = async (pattern) => {
    if (!redisClient || !isConnected)
        return;
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    }
    catch (err) {
        logger_1.default.error('Redis DEL pattern error:', err);
    }
};
exports.cacheDelPattern = cacheDelPattern;
//# sourceMappingURL=redis.js.map