import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails, emailFolders } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

// ✅ In-memory cache to prevent excessive database queries
const metricsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000; // 1 second cache (prevents sub-second duplicate requests)

/**
 * GET /api/nylas/sync/metrics
 * Returns detailed sync metrics for real-time dashboard
 * Uses 1-second cache to prevent excessive database queries from polling
 */
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  // ✅ Check cache first
  const cached = metricsCache.get(accountId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    // ✅ Security: Verify account ownership
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account details with sync metrics
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify ownership
    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Get actual email count in database
    const emailCountResult = await db
      .select({ count: count() })
      .from(emails)
      .where(eq(emails.accountId, accountId));

    const actualEmailCount = emailCountResult[0]?.count || 0;

    // Get folder sync status
    const folderCountResult = await db
      .select({ count: count() })
      .from(emailFolders)
      .where(eq(emailFolders.accountId, accountId));

    const foldersSynced = folderCountResult[0]?.count || 0;

    // Get sync metrics from metadata (stored by background sync)
    const metadata = account.metadata as any || {};
    const currentPage = metadata.currentPage || 0;
    const maxPages = metadata.maxPages || 1000;
    const emailsPerMinute = metadata.emailsPerMinute || 0;
    const lastBatchSize = metadata.lastBatchSize || 0;

    // ✅ FIX #2 & #7: Calculate estimated time remaining with smart fallback
    let estimatedTimeRemaining = null;
    let estimatedTotalCount = account.totalEmailCount || 0;

    // If no total from provider, estimate based on current sync rate
    if ((!estimatedTotalCount || estimatedTotalCount === 0) && actualEmailCount > 100 && currentPage > 1) {
      // Smart estimate: emails per page * estimated remaining pages
      const emailsPerPage = actualEmailCount / currentPage;
      // Most mailboxes don't exceed 100 pages for initial sync
      const estimatedRemainingPages = Math.max(50 - currentPage, 10);
      estimatedTotalCount = Math.round(actualEmailCount + (emailsPerPage * estimatedRemainingPages));
    }

    if (emailsPerMinute > 0 && estimatedTotalCount > 0) {
      const remainingEmails = estimatedTotalCount - actualEmailCount;
      estimatedTimeRemaining = Math.ceil(remainingEmails / emailsPerMinute);
    }

    // ✅ FIX #1: Use ACTUAL database count as the source of truth
    // The syncedEmailCount counter can be inaccurate due to duplicates/failures
    // Always trust the database count over the counter
    const trueSyncedCount = actualEmailCount; // This is the REAL count

    // ✅ FIX #3: Calculate accurate progress based on actual data
    let accurateProgress = account.syncProgress || 0;
    const totalToUse = estimatedTotalCount || account.totalEmailCount || 0;

    if (totalToUse > 0) {
      // Use actual/estimated total for precise progress
      accurateProgress = Math.min(Math.round((trueSyncedCount / totalToUse) * 100), 100);
    } else if (currentPage > 0 && trueSyncedCount > 0) {
      // Fallback: estimate based on pages (assume ~50 pages average)
      accurateProgress = Math.min(Math.round((currentPage / 50) * 100), 99);
    }

    // Build comprehensive metrics object
    const metrics = {
      // Core sync status
      syncStatus: account.syncStatus || 'idle',
      syncProgress: accurateProgress, // ✅ Use calculated accurate progress
      syncedEmailCount: trueSyncedCount, // ✅ Use actual DB count, not counter
      totalEmailCount: estimatedTotalCount, // ✅ Use estimated if provider didn't give total
      actualEmailCount, // Keep for comparison/debugging
      isEstimated: !account.totalEmailCount || account.totalEmailCount === 0, // Flag if we're estimating

      // Timing
      lastSyncedAt: account.lastSyncedAt?.toISOString() || null,
      initialSyncCompleted: account.initialSyncCompleted || false,

      // Error tracking
      lastError: account.lastError || null,
      retryCount: account.retryCount || 0,
      lastRetryAt: account.lastRetryAt?.toISOString() || null,

      // Advanced metrics
      continuationCount: account.continuationCount || 0,
      emailsPerMinute,
      estimatedTimeRemaining,
      currentPage,
      maxPages,
      lastBatchSize,

      // Folder sync
      foldersSynced,
      totalFolders: foldersSynced, // We don't know total until all are synced

      // Sync cursor (for debugging)
      hasSyncCursor: !!account.syncCursor,

      // Account details
      emailProvider: account.emailProvider || account.nylasProvider,

      // Health indicators
      isHealthy: !account.lastError && account.syncStatus !== 'error',
      needsReconnect: account.lastError?.includes('Authentication') ||
                      account.lastError?.includes('reconnect') ||
                      account.lastError?.includes('token'),
    };

    const response = {
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    };

    // ✅ Cache the response
    metricsCache.set(accountId, {
      data: response,
      timestamp: Date.now(),
    });

    // ✅ Cleanup old cache entries (keep max 100 entries)
    if (metricsCache.size > 100) {
      const oldestKey = metricsCache.keys().next().value;
      if (oldestKey) metricsCache.delete(oldestKey);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch sync metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch sync metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
