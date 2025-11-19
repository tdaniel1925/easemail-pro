import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Comprehensive sync diagnostics endpoint
 * Returns detailed sync status, activity tracking, and health metrics
 */
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  try {
    // Get account details
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Get actual email count from database
    const emailCountResult = await db
      .select({ count: count() })
      .from(emails)
      .where(eq(emails.accountId, accountId));

    const actualEmailCount = emailCountResult[0]?.count || 0;

    // Calculate activity status
    const now = Date.now();
    const lastActivityMs = account.lastActivityAt ? now - new Date(account.lastActivityAt).getTime() : null;
    const lastSyncMs = account.lastSyncedAt ? now - new Date(account.lastSyncedAt).getTime() : null;

    // ✅ OPTIMIZED: Determine if sync is stuck (no activity for 10+ minutes while in syncing status)
    // Increased from 5 to 10 minutes to reduce false positives from rate limiting/retries
    const isStuck =
      (account.syncStatus === 'background_syncing' || account.syncStatus === 'syncing') &&
      lastActivityMs !== null &&
      lastActivityMs > 10 * 60 * 1000; // 10 minutes (increased from 5)

    // Check if sync is in retry backoff
    const isInRetryBackoff = 
      (account.retryCount ?? 0) > 0 &&
      account.lastRetryAt &&
      (now - new Date(account.lastRetryAt).getTime()) < 120000; // Less than 2 min since last retry

    return NextResponse.json({
      success: true,
      diagnostics: {
        // Basic info
        accountId: account.id,
        emailAddress: account.emailAddress,
        provider: account.nylasProvider || account.provider,
        
        // Sync status
        syncStatus: account.syncStatus,
        syncProgress: account.syncProgress,
        initialSyncCompleted: account.initialSyncCompleted,
        
        // Counts
        syncedEmailCount: account.syncedEmailCount,
        actualEmailCount,
        countMismatch: account.syncedEmailCount !== actualEmailCount,
        totalEmailCount: account.totalEmailCount,
        
        // Cursor & pagination
        hasCursor: !!account.syncCursor,
        cursorPreview: account.syncCursor?.substring(0, 20) + '...',
        continuationCount: account.continuationCount ?? 0,
        
        // Activity tracking
        lastSyncedAt: account.lastSyncedAt,
        lastActivityAt: account.lastActivityAt,
        timeSinceLastSync: lastSyncMs ? `${Math.round(lastSyncMs / 1000)}s ago` : 'Never',
        timeSinceLastActivity: lastActivityMs ? `${Math.round(lastActivityMs / 1000)}s ago` : 'Never',
        
        // Error & retry info
        lastError: account.lastError,
        retryCount: account.retryCount ?? 0,
        lastRetryAt: account.lastRetryAt,
        isInRetryBackoff,
        
        // Health status
        isStuck,
        isActive: account.syncStatus === 'background_syncing' || account.syncStatus === 'syncing',
        needsRestart: isStuck || (account.syncStatus === 'error'),
        
        // Metadata
        metadata: account.metadata,
        
        // Recommendations
        recommendations: getRecommendations({
          syncStatus: account.syncStatus,
          isStuck,
          lastError: account.lastError,
          retryCount: account.retryCount ?? 0,
          continuationCount: account.continuationCount ?? 0,
          countMismatch: account.syncedEmailCount !== actualEmailCount,
        }),
      },
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diagnostics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getRecommendations(params: {
  syncStatus: string | null;
  isStuck: boolean;
  lastError: string | null;
  retryCount: number;
  continuationCount: number;
  countMismatch: boolean;
}): string[] {
  const recommendations: string[] = [];

  if (params.isStuck) {
    recommendations.push('⚠️ Sync appears stuck (no activity for 10+ minutes). Force restart recommended.');
  }

  if (params.syncStatus === 'error') {
    recommendations.push('❌ Sync in error state. Check lastError and restart sync.');
  }

  if (params.retryCount >= 3) {
    recommendations.push('🔄 Max retries reached. Issue may require manual intervention.');
  }

  if (params.continuationCount > 50) {
    recommendations.push('⏰ High continuation count. Sync may be taking very long or hitting timeouts.');
  }

  if (params.countMismatch) {
    recommendations.push('📊 Count mismatch detected. Database count differs from tracked count.');
  }

  if (params.lastError?.includes('429') || params.lastError?.includes('rate limit')) {
    recommendations.push('⏱️ Rate limit detected. Wait 5-15 minutes before retrying.');
  }

  if (params.lastError?.includes('503') || params.lastError?.includes('Service Unavailable')) {
    recommendations.push('🔧 Service error detected. Provider API may be down. Retry in 1-2 minutes.');
  }

  if (recommendations.length === 0) {
    if (params.syncStatus === 'completed') {
      recommendations.push('✅ Sync completed successfully.');
    } else if (params.syncStatus === 'background_syncing') {
      recommendations.push('🔄 Sync in progress. Monitor activity timestamps.');
    } else {
      recommendations.push('✅ No issues detected.');
    }
  }

  return recommendations;
}

