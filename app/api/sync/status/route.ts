/**
 * Sync Status API Endpoint
 *
 * Provides comprehensive sync status information for the frontend.
 * Used by the UI to display sync progress, health, and statistics.
 *
 * GET /api/sync/status?accountId=xxx
 * GET /api/sync/status (returns all accounts for authenticated user)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';
import { getDeltaSyncStats } from '@/lib/sync/delta-sync';
import { getCircuitBreakerStats } from '@/lib/sync/circuit-breaker-v2';
import { getQuotaStats } from '@/lib/sync/quota-monitor-redis';
import { getActiveConnectionCount } from '@/lib/sync/sse-broadcaster';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');

    // If specific account requested
    if (accountId) {
      // Verify account belongs to user
      const account = await db.query.emailAccounts.findFirst({
        where: and(
          eq(emailAccounts.id, accountId),
          eq(emailAccounts.userId, user.id)
        ),
      });

      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      // Get email counts by folder
      const folderCounts = await db
        .select({
          folder: emails.folder,
          total: count(),
          unread: sql<number>`SUM(CASE WHEN ${emails.isRead} = false THEN 1 ELSE 0 END)`,
        })
        .from(emails)
        .where(eq(emails.accountId, accountId))
        .groupBy(emails.folder);

      // Get delta sync stats
      const deltaStats = await getDeltaSyncStats(accountId);

      // Get circuit breaker status
      const circuitBreaker = await getCircuitBreakerStats(account.emailProvider || 'unknown', accountId);

      // Get quota stats
      const quotaStats = await getQuotaStats(account.emailProvider || 'unknown', accountId);

      // Get SSE connection count
      const sseConnections = getActiveConnectionCount(accountId);

      // Calculate sync health score (0-100)
      const healthScore = calculateHealthScore({
        syncStatus: account.syncStatus,
        lastSyncedAt: account.lastSyncedAt,
        lastError: account.lastError,
        circuitBreakerOpen: Object.values(circuitBreaker).some(cb => cb.state === 'OPEN'),
        rateLimitHits: quotaStats.recentRateLimits,
      });

      return NextResponse.json({
        success: true,
        account: {
          id: account.id,
          emailAddress: account.emailAddress,
          provider: account.emailProvider,
          syncStatus: account.syncStatus,
          syncProgress: account.syncProgress || 0,
          syncedEmailCount: account.syncedEmailCount || 0,
          totalEmailCount: account.totalEmailCount || 0,
          lastSyncedAt: account.lastSyncedAt,
          lastActivityAt: account.lastActivityAt,
          lastError: account.lastError,
          initialSyncCompleted: account.initialSyncCompleted,
          continuationCount: account.continuationCount || 0,
          retryCount: account.retryCount || 0,
        },
        folderCounts: folderCounts.reduce((acc, fc) => {
          acc[fc.folder || 'unknown'] = {
            total: Number(fc.total),
            unread: Number(fc.unread) || 0,
          };
          return acc;
        }, {} as Record<string, { total: number; unread: number }>),
        deltaSync: deltaStats,
        circuitBreaker: Object.values(circuitBreaker)[0] || null,
        quota: quotaStats,
        sseConnections,
        healthScore,
        healthStatus: getHealthStatus(healthScore),
      });
    }

    // Return all accounts for user
    const accounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, user.id),
      columns: {
        id: true,
        emailAddress: true,
        emailProvider: true,
        syncStatus: true,
        syncProgress: true,
        syncedEmailCount: true,
        totalEmailCount: true,
        lastSyncedAt: true,
        lastError: true,
        initialSyncCompleted: true,
      },
    });

    // Get total email count per account
    const emailCounts = await db
      .select({
        accountId: emails.accountId,
        total: count(),
      })
      .from(emails)
      .groupBy(emails.accountId);

    const emailCountMap = new Map(emailCounts.map(ec => [ec.accountId, Number(ec.total)]));

    const accountsWithStats = accounts.map((account) => {
      const healthScore = calculateHealthScore({
        syncStatus: account.syncStatus,
        lastSyncedAt: account.lastSyncedAt,
        lastError: account.lastError,
        circuitBreakerOpen: false,
        rateLimitHits: 0,
      });

      return {
        ...account,
        emailCount: emailCountMap.get(account.id) || 0,
        healthScore,
        healthStatus: getHealthStatus(healthScore),
        sseConnections: getActiveConnectionCount(account.id),
      };
    });

    return NextResponse.json({
      success: true,
      accounts: accountsWithStats,
      totalAccounts: accounts.length,
      syncingCount: accounts.filter(a => a.syncStatus === 'syncing' || a.syncStatus === 'background_syncing').length,
      errorCount: accounts.filter(a => a.syncStatus === 'error').length,
    });
  } catch (error) {
    console.error('[SyncStatus] Error:', error);
    return NextResponse.json({
      error: 'Failed to get sync status',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Calculate health score based on sync metrics
 */
function calculateHealthScore(metrics: {
  syncStatus: string | null;
  lastSyncedAt: Date | null;
  lastError: string | null;
  circuitBreakerOpen: boolean;
  rateLimitHits: number;
}): number {
  let score = 100;

  // Sync status penalties
  if (metrics.syncStatus === 'error') {
    score -= 40;
  } else if (metrics.syncStatus === 'paused') {
    score -= 20;
  }

  // Last sync age penalties
  if (metrics.lastSyncedAt) {
    const ageHours = (Date.now() - new Date(metrics.lastSyncedAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 24) {
      score -= 30;
    } else if (ageHours > 12) {
      score -= 20;
    } else if (ageHours > 6) {
      score -= 10;
    } else if (ageHours > 1) {
      score -= 5;
    }
  } else {
    score -= 20; // Never synced
  }

  // Error penalties
  if (metrics.lastError) {
    score -= 10;
  }

  // Circuit breaker penalties
  if (metrics.circuitBreakerOpen) {
    score -= 25;
  }

  // Rate limit penalties
  if (metrics.rateLimitHits > 5) {
    score -= 15;
  } else if (metrics.rateLimitHits > 2) {
    score -= 10;
  } else if (metrics.rateLimitHits > 0) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get health status label from score
 */
function getHealthStatus(score: number): 'healthy' | 'warning' | 'critical' | 'unknown' {
  if (score >= 80) return 'healthy';
  if (score >= 50) return 'warning';
  if (score >= 0) return 'critical';
  return 'unknown';
}
