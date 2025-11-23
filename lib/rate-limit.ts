/**
 * Rate Limiting Utility
 * Provides rate limiting functionality using Upstash Redis or in-memory fallback
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// In-memory rate limiting fallback
class InMemoryRateLimit {
  private storage = new Map<string, { count: number; resetAt: number }>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of Array.from(this.storage.entries())) {
        if (value.resetAt < now) {
          this.storage.delete(key);
        }
      }
    }, 60000);
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry || entry.resetAt < now) {
      // New window
      const resetAt = now + this.windowMs;
      this.storage.set(identifier, { count: 1, resetAt });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: Math.floor(resetAt / 1000),
      };
    }

    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: Math.floor(entry.resetAt / 1000),
      };
    }

    // Increment count
    entry.count++;
    this.storage.set(identifier, entry);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      reset: Math.floor(entry.resetAt / 1000),
    };
  }
}

// Create rate limiter instance
let rateLimiter: Ratelimit | InMemoryRateLimit;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Use Upstash Redis for production
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requests per hour
    analytics: true,
    prefix: 'easemail:ratelimit',
  });
} else {
  // Use in-memory fallback for development
  console.warn('⚠️ Using in-memory rate limiting (development only)');
  rateLimiter = new InMemoryRateLimit(5, 60 * 60 * 1000); // 5 requests per hour
}

/**
 * Rate limit a request based on an identifier
 * @param identifier - Unique identifier for the rate limit (e.g., 'api:userId', 'rsvp:eventId:email')
 * @returns Promise with rate limit result
 */
export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  return await rateLimiter.limit(identifier);
}

/**
 * Default rate limiter instance
 */
export const ratelimit = {
  limit: rateLimit,
};

/**
 * Create a custom rate limiter with specific limits
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
      analytics: true,
      prefix: 'easemail:ratelimit',
    });
  }

  return new InMemoryRateLimit(maxRequests, windowMs);
}
