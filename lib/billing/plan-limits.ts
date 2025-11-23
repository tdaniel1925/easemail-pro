/**
 * Plan Limits Enforcement
 *
 * Checks user subscription tiers and enforces monthly usage quotas
 * for AI features
 */

import { db } from '@/lib/db/drizzle';
import { users, ai_usage } from '@/lib/db/schema';
import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';

// ✅ PERFORMANCE FIX: In-memory cache to avoid expensive DB queries on every AI request
// Cache TTL: 5 minutes (300000ms)
const CACHE_TTL = 5 * 60 * 1000;
interface CacheEntry<T> {
  data: T;
  expires: number;
}
const tierCache = new Map<string, CacheEntry<SubscriptionTier>>();
const usageCache = new Map<string, CacheEntry<number>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL,
  });
}

// Plan limit definitions
export const AI_LIMITS = {
  free: {
    monthlyRequests: 10,
    name: 'Free',
    upgradeMessage: 'Upgrade to Starter for 100 AI requests per month',
    upgradeUrl: '/pricing',
  },
  starter: {
    monthlyRequests: 100,
    name: 'Starter',
    upgradeMessage: 'Upgrade to Pro for 500 AI requests per month',
    upgradeUrl: '/pricing',
  },
  pro: {
    monthlyRequests: 500,
    name: 'Pro',
    upgradeMessage: 'Upgrade to Enterprise for unlimited AI requests',
    upgradeUrl: '/contact',
  },
  enterprise: {
    monthlyRequests: Infinity,
    name: 'Enterprise',
    upgradeMessage: 'You have unlimited AI requests',
    upgradeUrl: '/pricing',
  },
} as const;

export type SubscriptionTier = keyof typeof AI_LIMITS;

interface AILimitCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  tier: SubscriptionTier;
  used: number;
  message?: string;
  upgradeUrl?: string;
}

/**
 * Get user's subscription tier (with caching)
 */
async function getUserTier(userId: string): Promise<SubscriptionTier> {
  // ✅ Check cache first
  const cached = getCached(tierCache, userId);
  if (cached) {
    console.log(`[Plan Limits] Using cached tier for user ${userId}: ${cached}`);
    return cached;
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { subscriptionTier: true, isPromoUser: true },
    });

    // Promo/beta users get unlimited AI access (enterprise tier)
    if (user?.isPromoUser) {
      console.log(`[Plan Limits] User ${userId} is a promo/beta user - granting enterprise access`);
      setCache(tierCache, userId, 'enterprise');
      return 'enterprise';
    }

    const tier = user?.subscriptionTier as SubscriptionTier | null;

    // Default to free if tier not set or invalid
    if (!tier || !AI_LIMITS[tier]) {
      setCache(tierCache, userId, 'free');
      return 'free';
    }

    setCache(tierCache, userId, tier);
    return tier;
  } catch (error) {
    console.error('[Plan Limits] Failed to get user tier:', error);
    return 'free'; // Default to free on error
  }
}

/**
 * Get user's monthly AI usage count (with caching)
 */
async function getMonthlyAIUsage(userId: string): Promise<number> {
  // ✅ Check cache first
  const cached = getCached(usageCache, userId);
  if (cached !== null) {
    console.log(`[Plan Limits] Using cached usage for user ${userId}: ${cached}`);
    return cached;
  }

  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Sum all AI requests across all features for this month
    const result = await db
      .select({
        total: sum(ai_usage.requestCount).mapWith(Number),
      })
      .from(ai_usage)
      .where(
        and(
          eq(ai_usage.userId, userId),
          gte(ai_usage.periodStart, periodStart),
          lte(ai_usage.periodEnd, periodEnd)
        )
      );

    const total = result[0]?.total || 0;
    setCache(usageCache, userId, total);
    return total;
  } catch (error) {
    console.error('[Plan Limits] Failed to get monthly AI usage:', error);
    return 0;
  }
}

/**
 * Check if user can make an AI request
 *
 * @param userId - User ID to check
 * @returns Result object with allowed status and usage details
 */
export async function checkAILimit(userId: string): Promise<AILimitCheckResult> {
  try {
    // Get user's tier and usage
    const tier = await getUserTier(userId);
    const used = await getMonthlyAIUsage(userId);
    const limits = AI_LIMITS[tier];
    const limit = limits.monthlyRequests;
    const remaining = Math.max(0, limit - used);
    const allowed = remaining > 0 || limit === Infinity;

    console.log(`[Plan Limits] User ${userId}: ${tier} tier, ${used}/${limit} requests used`);

    if (!allowed) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        tier,
        used,
        message: `You've reached your monthly limit of ${limit} AI requests. ${limits.upgradeMessage}`,
        upgradeUrl: limits.upgradeUrl,
      };
    }

    return {
      allowed: true,
      remaining,
      limit,
      tier,
      used,
    };
  } catch (error) {
    console.error('[Plan Limits] Failed to check AI limit:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: 999,
      limit: 999,
      tier: 'free',
      used: 0,
      message: 'Error checking limits - request allowed',
    };
  }
}

/**
 * Enforce AI limit - throws if limit exceeded
 * Use this in API routes that need hard enforcement
 *
 * @param userId - User ID to check
 * @throws Error if limit exceeded
 */
export async function enforceAILimit(userId: string): Promise<void> {
  const result = await checkAILimit(userId);

  if (!result.allowed) {
    const error = new Error(result.message || 'AI usage limit exceeded');
    (error as any).status = 429;
    (error as any).upgradeUrl = result.upgradeUrl;
    (error as any).tier = result.tier;
    (error as any).used = result.used;
    (error as any).limit = result.limit;
    throw error;
  }
}

/**
 * Get feature-specific usage (optional - for detailed breakdowns)
 */
export async function getFeatureUsage(userId: string, feature: string): Promise<number> {
  try {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const result = await db.query.ai_usage.findFirst({
      where: and(
        eq(ai_usage.userId, userId),
        eq(ai_usage.feature, feature),
        gte(ai_usage.periodStart, periodStart),
        lte(ai_usage.periodEnd, periodEnd)
      ),
      columns: { requestCount: true },
    });

    return result?.requestCount || 0;
  } catch (error) {
    console.error(`[Plan Limits] Failed to get ${feature} usage:`, error);
    return 0;
  }
}

/**
 * Check if user is on a paid plan
 */
export async function isPaidUser(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId);
  return tier !== 'free';
}

/**
 * Get all usage stats for a user (for dashboard/settings display)
 */
export async function getUserUsageStats(userId: string) {
  const tier = await getUserTier(userId);
  const used = await getMonthlyAIUsage(userId);
  const limits = AI_LIMITS[tier];
  const limit = limits.monthlyRequests;
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  const percentage = limit === Infinity ? 0 : Math.round((used / limit) * 100);

  return {
    tier,
    used,
    limit,
    remaining,
    percentage,
    tierName: limits.name,
    upgradeMessage: limits.upgradeMessage,
    upgradeUrl: limits.upgradeUrl,
  };
}
