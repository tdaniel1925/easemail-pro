/**
 * Redis-backed Quota Usage Monitoring
 *
 * Tracks and logs API quota usage with persistent storage in Redis.
 * This replaces the in-memory implementation to:
 * 1. Survive server restarts
 * 2. Share quota state across multiple serverless instances
 * 3. Provide accurate rate limit tracking
 *
 * Falls back to in-memory storage when Redis is not available.
 */

import { cache } from '@/lib/redis/client';

// Cache keys
const QUOTA_HISTORY_KEY = 'easemail:quota:history';
const QUOTA_STATS_KEY = 'easemail:quota:stats';
const QUOTA_BY_ACCOUNT_PREFIX = 'easemail:quota:account:';

// TTL for quota data (24 hours)
const QUOTA_TTL_SECONDS = 24 * 60 * 60;

// Max history entries per account
const MAX_HISTORY_PER_ACCOUNT = 100;

export interface QuotaUsage {
  provider: string;
  accountId: string;
  timestamp: number;
  quotaUsed?: number;
  quotaRemaining?: number;
  quotaLimit?: number;
  quotaResetAt?: number;
  requestsMade: number;
  rateLimitHit: boolean;
}

interface QuotaStats {
  totalRequests: number;
  rateLimitsHit: number;
  lastUpdated: number;
  byProvider: Record<string, {
    requests: number;
    rateLimits: number;
    accounts: string[];
  }>;
}

// In-memory fallback when Redis is not available
let inMemoryHistory: QuotaUsage[] = [];
const MAX_IN_MEMORY_ENTRIES = 1000;

/**
 * Extract quota information from response headers
 */
export function extractQuotaInfo(headers: Headers | Record<string, string>, provider: string): {
  quotaUsed?: number;
  quotaRemaining?: number;
  quotaLimit?: number;
  quotaResetAt?: number;
} {
  const info: Partial<QuotaUsage> = {};

  const getHeader = (name: string): string | null => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    return headers[name] || headers[name.toLowerCase()] || null;
  };

  // Gmail-specific quota headers (via Nylas)
  if (provider === 'google' || provider === 'gmail') {
    const gmailQuota = getHeader('nylas-gmail-quota-usage');
    if (gmailQuota) {
      info.quotaUsed = parseInt(gmailQuota, 10);
    }
  }

  // Standard rate limit headers
  const remaining = getHeader('x-ratelimit-remaining');
  const limit = getHeader('x-ratelimit-limit');
  const reset = getHeader('x-ratelimit-reset');

  if (remaining !== null) {
    info.quotaRemaining = parseInt(remaining, 10);
  }

  if (limit !== null) {
    info.quotaLimit = parseInt(limit, 10);
  }

  if (reset !== null) {
    info.quotaResetAt = parseInt(reset, 10);
  }

  return info;
}

/**
 * Log quota usage to Redis (with in-memory fallback)
 */
export async function logQuotaUsage(
  provider: string,
  accountId: string,
  headers: Headers | Record<string, string>,
  rateLimitHit: boolean = false
): Promise<void> {
  const quotaInfo = extractQuotaInfo(headers, provider);

  const usage: QuotaUsage = {
    provider,
    accountId,
    timestamp: Date.now(),
    ...quotaInfo,
    requestsMade: 1,
    rateLimitHit,
  };

  // Log to console for visibility
  if (rateLimitHit) {
    console.log(`🚫 [Quota Monitor] Rate limit hit for ${provider} account ${accountId}`);
  }

  if (quotaInfo.quotaRemaining !== undefined && quotaInfo.quotaLimit) {
    const percentRemaining = Math.round((quotaInfo.quotaRemaining / quotaInfo.quotaLimit) * 100);
    if (percentRemaining < 20) {
      console.warn(`⚠️ [Quota Monitor] ${provider} quota low: ${quotaInfo.quotaRemaining}/${quotaInfo.quotaLimit} (${percentRemaining}% remaining)`);
    }
  }

  // Try to save to Redis
  try {
    const accountKey = `${QUOTA_BY_ACCOUNT_PREFIX}${accountId}`;

    // Get existing history for this account
    const existingHistory = await cache.get<QuotaUsage[]>(accountKey) || [];

    // Add new entry and trim to max size
    existingHistory.push(usage);
    if (existingHistory.length > MAX_HISTORY_PER_ACCOUNT) {
      existingHistory.shift();
    }

    // Save back to Redis with TTL
    await cache.set(accountKey, existingHistory, QUOTA_TTL_SECONDS);

    // Update global stats
    await updateGlobalStats(usage);
  } catch (error) {
    // Fallback to in-memory storage
    console.warn('📊 [Quota Monitor] Redis unavailable, using in-memory storage');
    inMemoryHistory.push(usage);
    if (inMemoryHistory.length > MAX_IN_MEMORY_ENTRIES) {
      inMemoryHistory.shift();
    }
  }
}

/**
 * Update global quota statistics
 */
async function updateGlobalStats(usage: QuotaUsage): Promise<void> {
  try {
    const stats = await cache.get<QuotaStats>(QUOTA_STATS_KEY) || {
      totalRequests: 0,
      rateLimitsHit: 0,
      lastUpdated: Date.now(),
      byProvider: {},
    };

    stats.totalRequests++;
    stats.lastUpdated = Date.now();

    if (usage.rateLimitHit) {
      stats.rateLimitsHit++;
    }

    // Update per-provider stats
    if (!stats.byProvider[usage.provider]) {
      stats.byProvider[usage.provider] = {
        requests: 0,
        rateLimits: 0,
        accounts: [],
      };
    }

    stats.byProvider[usage.provider].requests++;
    if (usage.rateLimitHit) {
      stats.byProvider[usage.provider].rateLimits++;
    }

    // Track unique accounts
    if (!stats.byProvider[usage.provider].accounts.includes(usage.accountId)) {
      stats.byProvider[usage.provider].accounts.push(usage.accountId);
    }

    await cache.set(QUOTA_STATS_KEY, stats, QUOTA_TTL_SECONDS);
  } catch (error) {
    console.error('📊 [Quota Monitor] Failed to update global stats:', error);
  }
}

/**
 * Get quota statistics for a provider/account
 */
export async function getQuotaStats(provider?: string, accountId?: string): Promise<{
  totalRequests: number;
  rateLimitsHit: number;
  averageQuotaUsed?: number;
  lastQuotaRemaining?: number;
  lastQuotaLimit?: number;
  recentRateLimits: number;
}> {
  try {
    // If accountId specified, get account-specific history
    if (accountId) {
      const accountKey = `${QUOTA_BY_ACCOUNT_PREFIX}${accountId}`;
      const history = await cache.get<QuotaUsage[]>(accountKey) || [];

      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const recentHistory = history.filter(h => h.timestamp >= oneHourAgo);

      const quotaUsedEntries = history.filter(h => h.quotaUsed !== undefined);
      const averageQuotaUsed = quotaUsedEntries.length > 0
        ? quotaUsedEntries.reduce((sum, h) => sum + (h.quotaUsed || 0), 0) / quotaUsedEntries.length
        : undefined;

      const lastEntry = history[history.length - 1];

      return {
        totalRequests: history.length,
        rateLimitsHit: history.filter(h => h.rateLimitHit).length,
        averageQuotaUsed,
        lastQuotaRemaining: lastEntry?.quotaRemaining,
        lastQuotaLimit: lastEntry?.quotaLimit,
        recentRateLimits: recentHistory.filter(h => h.rateLimitHit).length,
      };
    }

    // Get global stats
    const stats = await cache.get<QuotaStats>(QUOTA_STATS_KEY);

    if (!stats) {
      return {
        totalRequests: 0,
        rateLimitsHit: 0,
        recentRateLimits: 0,
      };
    }

    // Filter by provider if specified
    if (provider && stats.byProvider[provider]) {
      return {
        totalRequests: stats.byProvider[provider].requests,
        rateLimitsHit: stats.byProvider[provider].rateLimits,
        recentRateLimits: 0, // Would need per-provider time tracking
      };
    }

    return {
      totalRequests: stats.totalRequests,
      rateLimitsHit: stats.rateLimitsHit,
      recentRateLimits: 0,
    };
  } catch (error) {
    console.error('📊 [Quota Monitor] Failed to get stats:', error);

    // Fall back to in-memory
    return getInMemoryStats(provider, accountId);
  }
}

/**
 * Get stats from in-memory storage (fallback)
 */
function getInMemoryStats(provider?: string, accountId?: string): {
  totalRequests: number;
  rateLimitsHit: number;
  recentRateLimits: number;
} {
  let history = inMemoryHistory;

  if (provider) {
    history = history.filter(h => h.provider === provider);
  }

  if (accountId) {
    history = history.filter(h => h.accountId === accountId);
  }

  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const recentHistory = history.filter(h => h.timestamp >= oneHourAgo);

  return {
    totalRequests: history.length,
    rateLimitsHit: history.filter(h => h.rateLimitHit).length,
    recentRateLimits: recentHistory.filter(h => h.rateLimitHit).length,
  };
}

/**
 * Get detailed quota report
 */
export async function getQuotaReport(): Promise<{
  summary: {
    totalRequests: number;
    totalRateLimits: number;
    rateLimitPercentage: number;
    lastUpdated: number;
  };
  byProvider: Record<string, {
    requests: number;
    rateLimits: number;
    accounts: number;
  }>;
}> {
  try {
    const stats = await cache.get<QuotaStats>(QUOTA_STATS_KEY);

    if (!stats) {
      return {
        summary: {
          totalRequests: 0,
          totalRateLimits: 0,
          rateLimitPercentage: 0,
          lastUpdated: 0,
        },
        byProvider: {},
      };
    }

    const byProvider: Record<string, { requests: number; rateLimits: number; accounts: number }> = {};

    for (const [provider, data] of Object.entries(stats.byProvider)) {
      byProvider[provider] = {
        requests: data.requests,
        rateLimits: data.rateLimits,
        accounts: data.accounts.length,
      };
    }

    return {
      summary: {
        totalRequests: stats.totalRequests,
        totalRateLimits: stats.rateLimitsHit,
        rateLimitPercentage: stats.totalRequests > 0
          ? Math.round((stats.rateLimitsHit / stats.totalRequests) * 100)
          : 0,
        lastUpdated: stats.lastUpdated,
      },
      byProvider,
    };
  } catch (error) {
    console.error('📊 [Quota Monitor] Failed to get report:', error);
    return {
      summary: {
        totalRequests: 0,
        totalRateLimits: 0,
        rateLimitPercentage: 0,
        lastUpdated: 0,
      },
      byProvider: {},
    };
  }
}

/**
 * Clear quota history for an account (for testing or manual reset)
 */
export async function clearQuotaHistory(accountId?: string): Promise<void> {
  try {
    if (accountId) {
      const accountKey = `${QUOTA_BY_ACCOUNT_PREFIX}${accountId}`;
      await cache.del(accountKey);
      console.log(`📊 [Quota Monitor] Cleared history for account ${accountId}`);
    } else {
      await cache.del(QUOTA_STATS_KEY);
      console.log('📊 [Quota Monitor] Cleared all quota stats');
    }
  } catch (error) {
    console.error('📊 [Quota Monitor] Failed to clear history:', error);
  }

  // Also clear in-memory fallback
  if (accountId) {
    inMemoryHistory = inMemoryHistory.filter(h => h.accountId !== accountId);
  } else {
    inMemoryHistory = [];
  }
}

/**
 * Check if account is approaching quota limits
 */
export async function isApproachingQuotaLimit(provider: string, accountId: string): Promise<boolean> {
  try {
    const accountKey = `${QUOTA_BY_ACCOUNT_PREFIX}${accountId}`;
    const history = await cache.get<QuotaUsage[]>(accountKey) || [];

    const recentEntries = history.slice(-10);

    if (recentEntries.length === 0) return false;

    const lastEntry = recentEntries[recentEntries.length - 1];

    // Check if quota remaining is low
    if (lastEntry.quotaRemaining !== undefined && lastEntry.quotaLimit !== undefined) {
      const percentRemaining = (lastEntry.quotaRemaining / lastEntry.quotaLimit) * 100;
      if (percentRemaining < 10) {
        return true;
      }
    }

    // Check if rate limits are frequent
    const rateLimitCount = recentEntries.filter(h => h.rateLimitHit).length;
    if (rateLimitCount >= 3) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('📊 [Quota Monitor] Failed to check quota limit:', error);
    return false;
  }
}
