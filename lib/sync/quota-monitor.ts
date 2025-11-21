/**
 * Quota Usage Monitoring
 * Tracks and logs API quota usage to prevent hitting limits
 */

interface QuotaUsage {
  provider: string;
  accountId: string;
  timestamp: number;
  quotaUsed?: number; // Gmail quota units used
  quotaRemaining?: number;
  quotaLimit?: number;
  quotaResetAt?: number;
  requestsMade: number;
  rateLimitHit: boolean;
}

// In-memory quota tracking (could be moved to Redis/database for production)
const quotaHistory: QuotaUsage[] = [];
const MAX_HISTORY_ENTRIES = 1000;

/**
 * Extract quota information from response headers
 */
export function extractQuotaInfo(headers: Headers | any, provider: string): {
  quotaUsed?: number;
  quotaRemaining?: number;
  quotaLimit?: number;
  quotaResetAt?: number;
} {
  const info: any = {};

  // Gmail-specific quota headers (via Nylas)
  if (provider === 'google' || provider === 'gmail') {
    const gmailQuota = headers.get?.('nylas-gmail-quota-usage') || headers['nylas-gmail-quota-usage'];
    if (gmailQuota) {
      info.quotaUsed = parseInt(gmailQuota, 10);
    }
  }

  // Standard rate limit headers
  const remaining = headers.get?.('x-ratelimit-remaining') || headers['x-ratelimit-remaining'];
  const limit = headers.get?.('x-ratelimit-limit') || headers['x-ratelimit-limit'];
  const reset = headers.get?.('x-ratelimit-reset') || headers['x-ratelimit-reset'];

  if (remaining !== null && remaining !== undefined) {
    info.quotaRemaining = parseInt(String(remaining), 10);
  }

  if (limit !== null && limit !== undefined) {
    info.quotaLimit = parseInt(String(limit), 10);
  }

  if (reset !== null && reset !== undefined) {
    info.quotaResetAt = parseInt(String(reset), 10);
  }

  return info;
}

/**
 * Log quota usage for monitoring
 */
export function logQuotaUsage(
  provider: string,
  accountId: string,
  headers: Headers | any,
  rateLimitHit: boolean = false
): void {
  const quotaInfo = extractQuotaInfo(headers, provider);

  const usage: QuotaUsage = {
    provider,
    accountId,
    timestamp: Date.now(),
    ...quotaInfo,
    requestsMade: 1,
    rateLimitHit,
  };

  // Add to history
  quotaHistory.push(usage);

  // Trim history if too large
  if (quotaHistory.length > MAX_HISTORY_ENTRIES) {
    quotaHistory.shift();
  }

  // Log to console for visibility
  if (rateLimitHit) {
    console.log(`🚫 [Quota Monitor] Rate limit hit for ${provider} account ${accountId}`);
  }

  if (quotaInfo.quotaUsed) {
    console.log(`📊 [Quota Monitor] ${provider} quota used: ${quotaInfo.quotaUsed} units`);
  }

  if (quotaInfo.quotaRemaining !== undefined) {
    const percentRemaining = quotaInfo.quotaLimit
      ? Math.round((quotaInfo.quotaRemaining / quotaInfo.quotaLimit) * 100)
      : null;

    if (percentRemaining !== null && percentRemaining < 20) {
      console.warn(`⚠️ [Quota Monitor] ${provider} quota low: ${quotaInfo.quotaRemaining}/${quotaInfo.quotaLimit} (${percentRemaining}% remaining)`);
    } else if (quotaInfo.quotaRemaining !== undefined) {
      console.log(`📊 [Quota Monitor] ${provider} quota remaining: ${quotaInfo.quotaRemaining}${quotaInfo.quotaLimit ? `/${quotaInfo.quotaLimit}` : ''}`);
    }
  }

  // Warn if reset time is soon
  if (quotaInfo.quotaResetAt) {
    const resetDate = new Date(quotaInfo.quotaResetAt * 1000);
    const minutesUntilReset = (quotaInfo.quotaResetAt * 1000 - Date.now()) / (1000 * 60);

    if (minutesUntilReset < 5 && quotaInfo.quotaRemaining && quotaInfo.quotaLimit) {
      const percentRemaining = Math.round((quotaInfo.quotaRemaining / quotaInfo.quotaLimit) * 100);
      if (percentRemaining < 10) {
        console.warn(`⏰ [Quota Monitor] ${provider} quota resets in ${Math.round(minutesUntilReset)} minutes at ${resetDate.toLocaleTimeString()}`);
      }
    }
  }
}

/**
 * Get quota statistics for a provider
 */
export function getQuotaStats(provider?: string, accountId?: string): {
  totalRequests: number;
  rateLimitsHit: number;
  averageQuotaUsed?: number;
  lastQuotaRemaining?: number;
  lastQuotaLimit?: number;
  recentRateLimits: number; // Last hour
} {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  let relevantHistory = quotaHistory;

  if (provider) {
    relevantHistory = relevantHistory.filter(h => h.provider === provider);
  }

  if (accountId) {
    relevantHistory = relevantHistory.filter(h => h.accountId === accountId);
  }

  const recentHistory = relevantHistory.filter(h => h.timestamp >= oneHourAgo);

  const totalRequests = relevantHistory.length;
  const rateLimitsHit = relevantHistory.filter(h => h.rateLimitHit).length;
  const recentRateLimits = recentHistory.filter(h => h.rateLimitHit).length;

  const quotaUsedEntries = relevantHistory.filter(h => h.quotaUsed !== undefined);
  const averageQuotaUsed = quotaUsedEntries.length > 0
    ? quotaUsedEntries.reduce((sum, h) => sum + (h.quotaUsed || 0), 0) / quotaUsedEntries.length
    : undefined;

  const lastEntry = relevantHistory[relevantHistory.length - 1];

  return {
    totalRequests,
    rateLimitsHit,
    averageQuotaUsed,
    lastQuotaRemaining: lastEntry?.quotaRemaining,
    lastQuotaLimit: lastEntry?.quotaLimit,
    recentRateLimits,
  };
}

/**
 * Get detailed quota report
 */
export function getQuotaReport(): {
  summary: {
    totalRequests: number;
    totalRateLimits: number;
    rateLimitPercentage: number;
  };
  byProvider: Record<string, {
    requests: number;
    rateLimits: number;
    accounts: number;
  }>;
  recentRateLimits: QuotaUsage[];
} {
  const summary = {
    totalRequests: quotaHistory.length,
    totalRateLimits: quotaHistory.filter(h => h.rateLimitHit).length,
    rateLimitPercentage: quotaHistory.length > 0
      ? Math.round((quotaHistory.filter(h => h.rateLimitHit).length / quotaHistory.length) * 100)
      : 0,
  };

  const byProvider: Record<string, any> = {};

  for (const entry of quotaHistory) {
    if (!byProvider[entry.provider]) {
      byProvider[entry.provider] = {
        requests: 0,
        rateLimits: 0,
        accounts: new Set(),
      };
    }

    byProvider[entry.provider].requests++;
    if (entry.rateLimitHit) {
      byProvider[entry.provider].rateLimits++;
    }
    byProvider[entry.provider].accounts.add(entry.accountId);
  }

  // Convert Set to count
  for (const provider in byProvider) {
    byProvider[provider].accounts = byProvider[provider].accounts.size;
  }

  const recentRateLimits = quotaHistory
    .filter(h => h.rateLimitHit)
    .slice(-10); // Last 10 rate limits

  return {
    summary,
    byProvider,
    recentRateLimits,
  };
}

/**
 * Clear quota history (for testing or manual reset)
 */
export function clearQuotaHistory(): void {
  quotaHistory.length = 0;
  console.log('📊 [Quota Monitor] History cleared');
}

/**
 * Check if account is approaching quota limits
 */
export function isApproachingQuotaLimit(provider: string, accountId: string): boolean {
  const recentEntries = quotaHistory
    .filter(h => h.provider === provider && h.accountId === accountId)
    .slice(-10); // Last 10 requests

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
  if (rateLimitCount >= 3) { // 3+ rate limits in last 10 requests
    return true;
  }

  return false;
}
