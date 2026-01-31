/**
 * SMS Rate Limiting Service (Redis-backed)
 * Prevents abuse with per-minute, per-hour, per-day, and per-month limits
 *
 * ✅ Uses Upstash Redis for high performance (replaces database queries)
 * Fallback to in-memory cache if Redis unavailable
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
  perDay: number;
  perMonth: number;
}

const DEFAULT_LIMITS: RateLimitConfig = {
  perMinute: 5,    // 5 SMS per minute
  perHour: 50,     // 50 SMS per hour
  perDay: 200,     // 200 SMS per day
  perMonth: 5000,  // 5000 SMS per month
};

// Initialize Redis connection
let redis: Redis | null = null;
let rateLimiters: {
  minute: Ratelimit | null;
  hour: Ratelimit | null;
  day: Ratelimit | null;
  month: Ratelimit | null;
} = {
  minute: null,
  hour: null,
  day: null,
  month: null,
};

// Initialize Redis and rate limiters
function initializeRedis() {
  if (redis) return redis;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      // Create sliding window rate limiters
      rateLimiters.minute = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(DEFAULT_LIMITS.perMinute, '1 m'),
        analytics: true,
        prefix: 'sms:ratelimit:minute',
      });

      rateLimiters.hour = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(DEFAULT_LIMITS.perHour, '1 h'),
        analytics: true,
        prefix: 'sms:ratelimit:hour',
      });

      rateLimiters.day = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(DEFAULT_LIMITS.perDay, '1 d'),
        analytics: true,
        prefix: 'sms:ratelimit:day',
      });

      rateLimiters.month = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(DEFAULT_LIMITS.perMonth, '30 d'),
        analytics: true,
        prefix: 'sms:ratelimit:month',
      });

      console.log('✅ SMS Rate Limiter initialized with Redis');
    } catch (error) {
      console.error('⚠️ Failed to initialize Redis for rate limiting:', error);
      redis = null;
    }
  } else {
    console.warn('⚠️ Redis not configured for SMS rate limiting - using fallback');
  }

  return redis;
}

// In-memory fallback for development (when Redis not available)
class InMemoryRateLimiter {
  private counts: Map<string, { count: number; resetAt: number }> = new Map();

  async check(key: string, limit: number, windowMs: number): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const entry = this.counts.get(key);

    if (!entry || entry.resetAt < now) {
      // Window expired or doesn't exist
      this.counts.set(key, { count: 1, resetAt: now + windowMs });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: now + windowMs,
      };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return {
        success: false,
        limit,
        remaining: 0,
        reset: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.counts.set(key, entry);

    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      reset: entry.resetAt,
    };
  }

  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.counts.entries()) {
      if (entry.resetAt < now) {
        this.counts.delete(key);
      }
    }
  }
}

const memoryLimiter = new InMemoryRateLimiter();

// Clean up memory limiter every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => memoryLimiter.cleanup(), 5 * 60 * 1000);
}

/**
 * Check if user has exceeded rate limits (Redis-backed)
 */
export async function checkRateLimit(
  userId: string,
  customLimits?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const limits = { ...DEFAULT_LIMITS, ...customLimits };
  initializeRedis();

  try {
    // Use Redis if available, otherwise fall back to in-memory
    if (rateLimiters.minute && rateLimiters.hour && rateLimiters.day && rateLimiters.month) {
      // Check all windows in parallel for better performance
      const [minuteResult, hourResult, dayResult, monthResult] = await Promise.all([
        rateLimiters.minute.limit(userId),
        rateLimiters.hour.limit(userId),
        rateLimiters.day.limit(userId),
        rateLimiters.month.limit(userId),
      ]);

      // Check if any window is exceeded
      if (!minuteResult.success) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(minuteResult.reset),
          reason: `Rate limit exceeded: ${limits.perMinute} messages per minute`,
        };
      }

      if (!hourResult.success) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(hourResult.reset),
          reason: `Rate limit exceeded: ${limits.perHour} messages per hour`,
        };
      }

      if (!dayResult.success) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(dayResult.reset),
          reason: `Daily limit exceeded: ${limits.perDay} messages per day`,
        };
      }

      if (!monthResult.success) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(monthResult.reset),
          reason: `Monthly limit exceeded: ${limits.perMonth} messages per month`,
        };
      }

      // All checks passed
      return {
        allowed: true,
        remaining: Math.min(
          minuteResult.remaining,
          hourResult.remaining,
          dayResult.remaining,
          monthResult.remaining
        ),
        resetAt: new Date(minuteResult.reset),
      };
    } else {
      // Fallback to in-memory rate limiting
      console.warn('⚠️ Using in-memory rate limiting (Redis unavailable)');

      const [minuteResult, hourResult, dayResult, monthResult] = await Promise.all([
        memoryLimiter.check(`${userId}:minute`, limits.perMinute, 60 * 1000),
        memoryLimiter.check(`${userId}:hour`, limits.perHour, 60 * 60 * 1000),
        memoryLimiter.check(`${userId}:day`, limits.perDay, 24 * 60 * 60 * 1000),
        memoryLimiter.check(`${userId}:month`, limits.perMonth, 30 * 24 * 60 * 60 * 1000),
      ]);

      if (!minuteResult.success) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(minuteResult.reset),
          reason: `Rate limit exceeded: ${limits.perMinute} messages per minute`,
        };
      }

      if (!hourResult.success) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(hourResult.reset),
          reason: `Rate limit exceeded: ${limits.perHour} messages per hour`,
        };
      }

      if (!dayResult.success) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(dayResult.reset),
          reason: `Daily limit exceeded: ${limits.perDay} messages per day`,
        };
      }

      if (!monthResult.success) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: new Date(monthResult.reset),
          reason: `Monthly limit exceeded: ${limits.perMonth} messages per month`,
        };
      }

      return {
        allowed: true,
        remaining: Math.min(
          minuteResult.remaining,
          hourResult.remaining,
          dayResult.remaining,
          monthResult.remaining
        ),
        resetAt: new Date(minuteResult.reset),
      };
    }
  } catch (error) {
    console.error('❌ Rate limit check error:', error);
    // On error, allow but log (fail open)
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(Date.now() + 60 * 1000),
    };
  }
}

/**
 * Get current usage for a user (Redis-backed)
 * Returns estimated counts from rate limiter state
 */
export async function getUserUsageStats(userId: string): Promise<{
  lastMinute: number;
  lastHour: number;
  lastDay: number;
  thisMonth: number;
}> {
  initializeRedis();

  try {
    if (rateLimiters.minute && rateLimiters.hour && rateLimiters.day && rateLimiters.month) {
      // Get remaining counts from rate limiters
      const [minuteResult, hourResult, dayResult, monthResult] = await Promise.all([
        rateLimiters.minute.getRemaining(userId),
        rateLimiters.hour.getRemaining(userId),
        rateLimiters.day.getRemaining(userId),
        rateLimiters.month.getRemaining(userId),
      ]);

      // Calculate used counts (limit - remaining)
      const minuteRemaining = typeof minuteResult === 'number' ? minuteResult : 0;
      const hourRemaining = typeof hourResult === 'number' ? hourResult : 0;
      const dayRemaining = typeof dayResult === 'number' ? dayResult : 0;
      const monthRemaining = typeof monthResult === 'number' ? monthResult : 0;

      return {
        lastMinute: Math.max(0, DEFAULT_LIMITS.perMinute - minuteRemaining),
        lastHour: Math.max(0, DEFAULT_LIMITS.perHour - hourRemaining),
        lastDay: Math.max(0, DEFAULT_LIMITS.perDay - dayRemaining),
        thisMonth: Math.max(0, DEFAULT_LIMITS.perMonth - monthRemaining),
      };
    } else {
      // Fallback: Return 0s if Redis unavailable
      console.warn('⚠️ Redis unavailable for usage stats');
      return {
        lastMinute: 0,
        lastHour: 0,
        lastDay: 0,
        thisMonth: 0,
      };
    }
  } catch (error) {
    console.error('❌ Error getting usage stats:', error);
    return {
      lastMinute: 0,
      lastHour: 0,
      lastDay: 0,
      thisMonth: 0,
    };
  }
}

