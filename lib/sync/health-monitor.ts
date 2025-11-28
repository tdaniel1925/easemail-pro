/**
 * Email Sync Health Monitoring
 *
 * Monitors the health of email sync connections and alerts on issues.
 * Provides Gmail/Outlook-like reliability by detecting and recovering from:
 * - Stalled syncs
 * - Repeated failures
 * - Rate limit issues
 * - Connection problems
 *
 * Features:
 * - Real-time health scoring
 * - Automatic recovery triggers
 * - Alert notifications
 * - Historical health tracking
 */

import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq, and, lt, or, isNull } from 'drizzle-orm';
import { cache } from '@/lib/redis/client';
import { getCircuitBreakerStats, hasOpenCircuits, getOpenCircuits } from '@/lib/sync/circuit-breaker-v2';
import { getQuotaReport } from '@/lib/sync/quota-monitor-redis';

// Health check thresholds
const THRESHOLDS = {
  STALE_SYNC_HOURS: 4, // Consider sync stale after 4 hours
  MAX_RETRY_COUNT: 5, // Max retries before marking unhealthy
  MAX_CONTINUATION_COUNT: 20, // Max continuations before concern
  RATE_LIMIT_THRESHOLD: 10, // Rate limits per hour before concern
  ACTIVITY_TIMEOUT_MINUTES: 15, // No activity for this long = stuck
};

// Cache keys
const HEALTH_CACHE_PREFIX = 'easemail:health:';
const HEALTH_HISTORY_KEY = 'easemail:health:history';
const HEALTH_TTL_SECONDS = 5 * 60; // 5 minutes

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface AccountHealth {
  accountId: string;
  emailAddress: string;
  status: HealthStatus;
  score: number; // 0-100
  issues: HealthIssue[];
  lastCheck: number;
  syncStatus: string;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

export interface HealthIssue {
  type: 'stale_sync' | 'sync_error' | 'rate_limited' | 'stuck_sync' | 'circuit_open' | 'high_retry_count' | 'never_synced';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestion: string;
  detectedAt: number;
}

export interface SystemHealth {
  overall: HealthStatus;
  score: number;
  totalAccounts: number;
  healthyAccounts: number;
  warningAccounts: number;
  criticalAccounts: number;
  openCircuits: string[];
  quotaSummary: {
    totalRequests: number;
    rateLimitPercentage: number;
  };
  issues: HealthIssue[];
  lastCheck: number;
}

/**
 * Check health of a specific account
 */
export async function checkAccountHealth(accountId: string): Promise<AccountHealth> {
  const account = await db.query.emailAccounts.findFirst({
    where: eq(emailAccounts.id, accountId),
  });

  if (!account) {
    return {
      accountId,
      emailAddress: 'unknown',
      status: 'unknown',
      score: 0,
      issues: [{
        type: 'sync_error',
        severity: 'critical',
        message: 'Account not found',
        suggestion: 'Reconnect the email account',
        detectedAt: Date.now(),
      }],
      lastCheck: Date.now(),
      syncStatus: 'unknown',
      lastSyncedAt: null,
      lastError: 'Account not found',
    };
  }

  const issues: HealthIssue[] = [];
  let score = 100;

  // Check if never synced
  if (!account.initialSyncCompleted && !account.lastSyncedAt) {
    issues.push({
      type: 'never_synced',
      severity: 'high',
      message: 'Account has never completed initial sync',
      suggestion: 'Trigger a sync from the settings page',
      detectedAt: Date.now(),
    });
    score -= 30;
  }

  // Check for stale sync
  if (account.lastSyncedAt) {
    const hoursSinceSync = (Date.now() - new Date(account.lastSyncedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceSync > THRESHOLDS.STALE_SYNC_HOURS) {
      issues.push({
        type: 'stale_sync',
        severity: hoursSinceSync > 24 ? 'high' : 'medium',
        message: `Last sync was ${Math.round(hoursSinceSync)} hours ago`,
        suggestion: 'Check if sync is blocked or trigger manual sync',
        detectedAt: Date.now(),
      });
      score -= Math.min(30, hoursSinceSync * 2);
    }
  }

  // Check for sync error
  if (account.syncStatus === 'error' || account.syncStatus === 'error_permanent') {
    issues.push({
      type: 'sync_error',
      severity: account.syncStatus === 'error_permanent' ? 'critical' : 'high',
      message: account.lastError || 'Sync failed with unknown error',
      suggestion: account.syncStatus === 'error_permanent'
        ? 'Reconnect the email account - authentication may have expired'
        : 'Wait for automatic retry or trigger manual sync',
      detectedAt: Date.now(),
    });
    score -= 40;
  }

  // Check for stuck sync
  if ((account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') && account.lastActivityAt) {
    const minutesSinceActivity = (Date.now() - new Date(account.lastActivityAt).getTime()) / (1000 * 60);
    if (minutesSinceActivity > THRESHOLDS.ACTIVITY_TIMEOUT_MINUTES) {
      issues.push({
        type: 'stuck_sync',
        severity: 'high',
        message: `Sync appears stuck - no activity for ${Math.round(minutesSinceActivity)} minutes`,
        suggestion: 'The sync will be automatically restarted by the cron job',
        detectedAt: Date.now(),
      });
      score -= 25;
    }
  }

  // Check retry count
  if (account.retryCount && account.retryCount >= THRESHOLDS.MAX_RETRY_COUNT) {
    issues.push({
      type: 'high_retry_count',
      severity: 'medium',
      message: `Sync has failed and retried ${account.retryCount} times`,
      suggestion: 'Check provider status and rate limits',
      detectedAt: Date.now(),
    });
    score -= 15;
  }

  // Check circuit breaker
  const circuitStats = await getCircuitBreakerStats(account.emailProvider || 'unknown', accountId);
  const circuitState = Object.values(circuitStats)[0];
  if (circuitState?.state === 'OPEN') {
    issues.push({
      type: 'circuit_open',
      severity: 'high',
      message: 'Rate limiting protection is active - syncing paused',
      suggestion: `Sync will resume in ${Math.round((circuitState.openUntilMs || 0) / 1000)} seconds`,
      detectedAt: Date.now(),
    });
    score -= 20;
  }

  // Determine overall status
  let status: HealthStatus = 'healthy';
  if (score < 30) status = 'critical';
  else if (score < 60) status = 'warning';

  const health: AccountHealth = {
    accountId,
    emailAddress: account.emailAddress || 'unknown',
    status,
    score: Math.max(0, Math.min(100, score)),
    issues,
    lastCheck: Date.now(),
    syncStatus: account.syncStatus || 'unknown',
    lastSyncedAt: account.lastSyncedAt,
    lastError: account.lastError,
  };

  // Cache the health check result
  try {
    await cache.set(`${HEALTH_CACHE_PREFIX}${accountId}`, health, HEALTH_TTL_SECONDS);
  } catch (error) {
    console.warn('[HealthMonitor] Failed to cache health check:', error);
  }

  return health;
}

/**
 * Check overall system health
 */
export async function checkSystemHealth(userId?: string): Promise<SystemHealth> {
  const whereClause = userId ? eq(emailAccounts.userId, userId) : undefined;

  const accounts = await db.query.emailAccounts.findMany({
    where: whereClause,
    columns: {
      id: true,
      emailAddress: true,
      emailProvider: true,
      syncStatus: true,
      lastSyncedAt: true,
      lastActivityAt: true,
      lastError: true,
      retryCount: true,
      initialSyncCompleted: true,
    },
  });

  const issues: HealthIssue[] = [];
  let healthyCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  // Check each account
  for (const account of accounts) {
    const health = await checkAccountHealth(account.id);

    if (health.status === 'healthy') healthyCount++;
    else if (health.status === 'warning') warningCount++;
    else if (health.status === 'critical') criticalCount++;

    // Add critical issues to system-level
    issues.push(...health.issues.filter(i => i.severity === 'critical' || i.severity === 'high'));
  }

  // Check for open circuit breakers
  const openCircuits = getOpenCircuits();
  if (openCircuits.length > 0) {
    issues.push({
      type: 'circuit_open',
      severity: 'high',
      message: `${openCircuits.length} provider(s) have rate limit protection active`,
      suggestion: 'Wait for rate limits to reset',
      detectedAt: Date.now(),
    });
  }

  // Get quota summary
  const quotaReport = await getQuotaReport();

  // Calculate overall score
  const totalAccounts = accounts.length;
  let overallScore = 100;

  if (totalAccounts > 0) {
    const healthyRatio = healthyCount / totalAccounts;
    overallScore = Math.round(healthyRatio * 70 + (criticalCount === 0 ? 20 : 0) + (openCircuits.length === 0 ? 10 : 0));
  }

  // Determine overall status
  let overall: HealthStatus = 'healthy';
  if (criticalCount > 0 || overallScore < 30) overall = 'critical';
  else if (warningCount > 0 || overallScore < 70) overall = 'warning';

  return {
    overall,
    score: overallScore,
    totalAccounts,
    healthyAccounts: healthyCount,
    warningAccounts: warningCount,
    criticalAccounts: criticalCount,
    openCircuits,
    quotaSummary: {
      totalRequests: quotaReport.summary.totalRequests,
      rateLimitPercentage: quotaReport.summary.rateLimitPercentage,
    },
    issues: issues.slice(0, 10), // Limit to 10 most important issues
    lastCheck: Date.now(),
  };
}

/**
 * Get accounts that need attention
 */
export async function getUnhealthyAccounts(userId?: string): Promise<AccountHealth[]> {
  const systemHealth = await checkSystemHealth(userId);
  const unhealthy: AccountHealth[] = [];

  // Re-check accounts that might be unhealthy
  const thresholdTime = new Date(Date.now() - THRESHOLDS.STALE_SYNC_HOURS * 60 * 60 * 1000);

  const whereConditions = [
    or(
      eq(emailAccounts.syncStatus, 'error'),
      eq(emailAccounts.syncStatus, 'error_permanent'),
      eq(emailAccounts.syncStatus, 'paused'),
      lt(emailAccounts.lastSyncedAt, thresholdTime),
      isNull(emailAccounts.lastSyncedAt)
    ),
  ];

  if (userId) {
    whereConditions.push(eq(emailAccounts.userId, userId));
  }

  const problemAccounts = await db.query.emailAccounts.findMany({
    where: and(...whereConditions),
    columns: { id: true },
  });

  for (const account of problemAccounts) {
    const health = await checkAccountHealth(account.id);
    if (health.status !== 'healthy') {
      unhealthy.push(health);
    }
  }

  return unhealthy;
}

/**
 * Record health check to history (for trending)
 */
export async function recordHealthHistory(systemHealth: SystemHealth): Promise<void> {
  try {
    const history = await cache.get<SystemHealth[]>(HEALTH_HISTORY_KEY) || [];

    // Keep last 24 hours of history (one check per hour max)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const filteredHistory = history.filter(h => h.lastCheck > oneHourAgo);

    filteredHistory.push(systemHealth);

    // Keep max 24 entries
    if (filteredHistory.length > 24) {
      filteredHistory.shift();
    }

    await cache.set(HEALTH_HISTORY_KEY, filteredHistory, 24 * 60 * 60); // 24 hour TTL
  } catch (error) {
    console.warn('[HealthMonitor] Failed to record health history:', error);
  }
}

/**
 * Get health history for trending
 */
export async function getHealthHistory(): Promise<SystemHealth[]> {
  try {
    return await cache.get<SystemHealth[]>(HEALTH_HISTORY_KEY) || [];
  } catch (error) {
    console.warn('[HealthMonitor] Failed to get health history:', error);
    return [];
  }
}
