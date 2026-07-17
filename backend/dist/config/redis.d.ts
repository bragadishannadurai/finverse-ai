import { RedisClientType } from 'redis';
export declare const connectRedis: () => Promise<void>;
export declare const getRedis: () => RedisClientType | null;
export declare const isRedisConnected: () => boolean;
export declare const cacheSet: (key: string, value: unknown, ttlSeconds?: number) => Promise<void>;
export declare const cacheGet: <T>(key: string) => Promise<T | null>;
export declare const cacheDel: (key: string) => Promise<void>;
export declare const cacheDelPattern: (pattern: string) => Promise<void>;
//# sourceMappingURL=redis.d.ts.map