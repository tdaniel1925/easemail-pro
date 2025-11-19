import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails, emailFolders } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/nylas/sync/metrics
 * Returns detailed sync metrics for real-time dashboard
 */
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
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

    // Calculate estimated time remaining
    let estimatedTimeRemaining = null;
    if (emailsPerMinute > 0 && account.totalEmailCount && account.totalEmailCount > 0) {
      const remainingEmails = account.totalEmailCount - (account.syncedEmailCount || 0);
      estimatedTimeRemaining = Math.ceil(remainingEmails / emailsPerMinute);
    }

    // Build comprehensive metrics object
    const metrics = {
      // Core sync status
      syncStatus: account.syncStatus || 'idle',
      syncProgress: account.syncProgress || 0,
      syncedEmailCount: account.syncedEmailCount || 0,
      // Use actualEmailCount as totalEmailCount during sync, then use stored total when complete
      totalEmailCount: account.initialSyncCompleted && account.totalEmailCount > 0 
        ? account.totalEmailCount 
        : actualEmailCount || account.syncedEmailCount || 0,
      actualEmailCount, // Real count from database

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

    return NextResponse.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString(),
    });
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
