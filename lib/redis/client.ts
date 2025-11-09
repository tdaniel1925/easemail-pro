/**
 * Redis Client Configuration
 * Supports both local Redis (development) and Upstash (production)
 */

import { Redis } from '@upstash/redis';
import IORedis from 'ioredis';

// Determine which Redis client to use based on environment
const USE_UPSTASH = process.env.REDIS_PROVIDER === 'upstash';

/**
 * Upstash Redis Client (serverless-friendly, production)
 * Free tier: 10,000 commands/day
 * Sign up: https://console.upstash.com/
 */
export function getUpstashClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.warn('⚠️ Upstash Redis credentials not configured');
    return null;
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

/**
 * IORedis Client (local development or traditional Redis)
 * Default connection: localhost:6379
 */
export function getIORedisClient(): IORedis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}

/**
 * Get the appropriate Redis client based on configuration
 */
export function getRedisClient(): Redis | IORedis | null {
  if (USE_UPSTASH) {
    return getUpstashClient();
  }

  // For local development
  if (process.env.NODE_ENV === 'development' || process.env.REDIS_URL) {
    return getIORedisClient();
  }

  console.warn('⚠️ No Redis client configured. Set REDIS_PROVIDER=upstash or REDIS_URL');
  return null;
}

/**
 * Cache utility functions
 */
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const value = await client.get(key);
      if (!value) return null;

      return JSON.parse(value as string) as T;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const serialized = JSON.stringify(value);

      if (ttl) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }

      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  },

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  },

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return false;
    }
  },

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      return await client.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error);
      return null;
    }
  },

  /**
   * Set expiration on a key (in seconds)
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  },
};
