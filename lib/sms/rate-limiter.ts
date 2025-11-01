/**
 * SMS Rate Limiting Service
 * Prevents abuse with per-minute, per-hour, per-day, and per-month limits
 */

import { db } from '@/lib/db/drizzle';
import { smsMessages } from '@/lib/db/schema';
import { eq, gte, and } from 'drizzle-orm';

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

/**
 * Check if user has exceeded rate limits
 */
export async function checkRateLimit(
  userId: string,
  customLimits?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const limits = { ...DEFAULT_LIMITS, ...customLimits };
  const now = new Date();

  try {
    // Check minute limit
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const minuteCount = await db
      .select()
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.userId, userId),
          gte(smsMessages.createdAt, oneMinuteAgo)
        )
      );

    if (minuteCount.length >= limits.perMinute) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now.getTime() + 60 * 1000),
        reason: `Rate limit exceeded: ${limits.perMinute} messages per minute`,
      };
    }

    // Check hour limit
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const hourCount = await db
      .select()
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.userId, userId),
          gte(smsMessages.createdAt, oneHourAgo)
        )
      );

    if (hourCount.length >= limits.perHour) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now.getTime() + 60 * 60 * 1000),
        reason: `Rate limit exceeded: ${limits.perHour} messages per hour`,
      };
    }

    // Check day limit
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dayCount = await db
      .select()
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.userId, userId),
          gte(smsMessages.createdAt, oneDayAgo)
        )
      );

    if (dayCount.length >= limits.perDay) {
      const resetAt = new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        reason: `Daily limit exceeded: ${limits.perDay} messages per day`,
      };
    }

    // Check month limit
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthCount = await db
      .select()
      .from(smsMessages)
      .where(
        and(
          eq(smsMessages.userId, userId),
          gte(smsMessages.createdAt, monthStart)
        )
      );

    if (monthCount.length >= limits.perMonth) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return {
        allowed: false,
        remaining: 0,
        resetAt: nextMonth,
        reason: `Monthly limit exceeded: ${limits.perMonth} messages per month`,
      };
    }

    // All checks passed
    return {
      allowed: true,
      remaining: Math.min(
        limits.perMinute - minuteCount.length,
        limits.perHour - hourCount.length,
        limits.perDay - dayCount.length,
        limits.perMonth - monthCount.length
      ),
      resetAt: new Date(now.getTime() + 60 * 1000),
    };
  } catch (error) {
    console.error('❌ Rate limit check error:', error);
    // On error, allow but log
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(now.getTime() + 60 * 1000),
    };
  }
}

/**
 * Get current usage for a user
 */
export async function getUserUsageStats(userId: string): Promise<{
  lastMinute: number;
  lastHour: number;
  lastDay: number;
  thisMonth: number;
}> {
  const now = new Date();

  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [minute, hour, day, month] = await Promise.all([
    db.select().from(smsMessages).where(and(eq(smsMessages.userId, userId), gte(smsMessages.createdAt, oneMinuteAgo))),
    db.select().from(smsMessages).where(and(eq(smsMessages.userId, userId), gte(smsMessages.createdAt, oneHourAgo))),
    db.select().from(smsMessages).where(and(eq(smsMessages.userId, userId), gte(smsMessages.createdAt, oneDayAgo))),
    db.select().from(smsMessages).where(and(eq(smsMessages.userId, userId), gte(smsMessages.createdAt, monthStart))),
  ]);

  return {
    lastMinute: minute.length,
    lastHour: hour.length,
    lastDay: day.length,
    thisMonth: month.length,
  };
}

