/**
 * 🔴 REDIS CONFIGURATION - Phase 6
 * 
 * Unified Redis client for cache, locks, rate limiting, and queues.
 * Graceful fallback: app works without Redis, just slower.
 */

import Redis from 'ioredis';
import { logger } from './logger.js';

type RedisClient = {
  on(event: string, listener: (...args: any[]) => void): void;
  connect(): Promise<void>;
  get(key: string): Promise<string | null>;
  setex(key: string, ttlSeconds: number, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number, condition: 'NX'): Promise<'OK' | null | string>;
  expire(key: string, ttlSeconds: number): Promise<number>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  multi(): {
    incr(key: string): unknown;
    ttl(key: string): unknown;
    exec(): Promise<Array<[unknown, unknown]>>;
  };
};

const REDIS_ENABLED = (process.env.REDIS_ENABLED ?? (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true';

// ==================== CONFIG ====================

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.error('Redis: max retries reached, using fallback');
      return null;
    }
    return Math.min(times * 200, 5000);
  },
  enableOfflineQueue: true,
  connectTimeout: 5000,
  commandTimeout: 2000,
  keepAlive: 30000,
  lazyConnect: true,
};

// ==================== SINGLETON ====================

let client: RedisClient | null = null;
let isConnected = false;
let connectAttempts = 0;
const MAX_ATTEMPTS = 5;
let disabledLogged = false;
let fallbackLogged = false;

function logFallbackOnce(message: string): void {
  if (fallbackLogged) return;
  fallbackLogged = true;
  logger.warn(message);
}

export async function getRedis(): Promise<RedisClient | null> {
  if (!REDIS_ENABLED) {
    if (!disabledLogged) {
      disabledLogged = true;
      logger.info('Redis disabled (REDIS_ENABLED=false), using fallback mode');
    }
    return null;
  }

  if (client && isConnected) return client;
  if (connectAttempts >= MAX_ATTEMPTS) return null;

  try {
    connectAttempts++;
    if (!client) {
      client = new (Redis as any)(REDIS_CONFIG) as RedisClient;
      client.on('connect', () => { isConnected = true; connectAttempts = 0; fallbackLogged = false; logger.info('✅ Redis connected'); });
      client.on('error', (_err) => {
        isConnected = false;
        logFallbackOnce('Redis unavailable, continuing in fallback mode');
      });
      client.on('close', () => { isConnected = false; });
    }
    await client.connect();
    return client;
  } catch (err: any) {
    logFallbackOnce(`Redis connect failed (attempt ${connectAttempts}), fallback mode enabled`);
    return null;
  }
}

export function isRedisConnected(): boolean {
  return isConnected && client !== null;
}

// ==================== CACHE WRAPPER ====================

export const cache = {
  /**
   * Get cached value. Returns null if Redis unavailable or key missing.
   */
  async get<T = any>(key: string): Promise<T | null> {
    const redis = await getRedis();
    if (!redis) return null;
    try {
      const val = await redis.get(`cache:${key}`);
      return val ? JSON.parse(val) : null;
    } catch { return null; }
  },

  /**
   * Set cached value with TTL in seconds.
   */
  async set(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
    const redis = await getRedis();
    if (!redis) return false;
    try {
      await redis.setex(`cache:${key}`, ttlSeconds, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  /**
   * Invalidate a cache key.
   */
  async del(key: string): Promise<boolean> {
    const redis = await getRedis();
    if (!redis) return false;
    try {
      await redis.del(`cache:${key}`);
      return true;
    } catch { return false; }
  },

  /**
   * Invalidate all keys matching a pattern.
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const redis = await getRedis();
    if (!redis) return 0;
    try {
      const keys = await redis.keys(`cache:${pattern}`);
      if (keys.length > 0) await redis.del(...keys);
      return keys.length;
    } catch { return 0; }
  },
};

// ==================== DISTRIBUTED LOCKS ====================

export const locks = {
  /**
   * Acquire a distributed lock. Returns true if acquired.
   * Uses SETNX with TTL to prevent deadlocks.
   */
  async acquire(lockName: string, ttlSeconds: number = 30): Promise<boolean> {
    const redis = await getRedis();
    if (!redis) return true; // Fail-open if no Redis
    try {
      const result = await redis.set(`lock:${lockName}`, Date.now().toString(), 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch { return true; }
  },

  /**
   * Release a distributed lock.
   */
  async release(lockName: string): Promise<void> {
    const redis = await getRedis();
    if (!redis) return;
    try {
      await redis.del(`lock:${lockName}`);
    } catch { /* ignore */ }
  },

  /**
   * Execute a function with a distributed lock.
   * If lock cannot be acquired, throws an error.
   */
  async withLock<T>(lockName: string, fn: () => Promise<T>, ttlSeconds: number = 30): Promise<T> {
    const acquired = await locks.acquire(lockName, ttlSeconds);
    if (!acquired) {
      throw new Error(`Could not acquire lock: ${lockName}`);
    }
    try {
      return await fn();
    } finally {
      await locks.release(lockName);
    }
  },
};

// ==================== RATE LIMITING (Redis-backed) ====================

export const redisRateLimit = {
  /**
   * Check and increment rate limit counter.
   * Returns { allowed: boolean, remaining: number, resetAt: number }
   */
  async check(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const redis = await getRedis();
    if (!redis) return { allowed: true, remaining: maxRequests, resetAt: 0 };

    const key = `rl:${identifier}`;
    try {
      const multi = redis.multi();
      multi.incr(key);
      multi.ttl(key);
      const results = await multi.exec();

      const count = (results?.[0]?.[1] as number) || 0;
      const ttl = (results?.[1]?.[1] as number) || -1;

      if (ttl === -1) {
        await redis.expire(key, windowSeconds);
      }

      const allowed = count <= maxRequests;
      const remaining = Math.max(0, maxRequests - count);
      const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000);

      return { allowed, remaining, resetAt };
    } catch {
      return { allowed: true, remaining: maxRequests, resetAt: 0 };
    }
  },
};

// ==================== HEALTH CHECK ====================

export async function redisHealthCheck(): Promise<{ available: boolean; latencyMs: number }> {
  const start = Date.now();
  const redis = await getRedis();
  if (!redis) return { available: false, latencyMs: -1 };

  try {
    await redis.ping();
    return { available: true, latencyMs: Date.now() - start };
  } catch {
    return { available: false, latencyMs: -1 };
  }
}

// ==================== SHUTDOWN ====================

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    isConnected = false;
    logger.info('Redis connection closed');
  }
}

export default { getRedis, cache, locks, redisRateLimit, redisHealthCheck, closeRedis, isRedisConnected };
