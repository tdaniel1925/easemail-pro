/**
 * Sync Status API
 * GET /api/sync-status
 * Returns detailed sync status for all user accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails, users } from '@/lib/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get userId from query params (for admin viewing specific user) or default to current user
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || user.id;

    // SECURITY: Verify authorization before allowing access to other users' data
    if (targetUserId !== user.id) {
      // Check if current user is a platform admin
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      if (!currentUser || currentUser.role !== 'platform_admin') {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Get all accounts for the target user
    const accounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, targetUserId),
    });

    // Optimize: Get all email counts in a single query using GROUP BY
    const accountIds = accounts.map(a => a.id);
    const emailCounts = accountIds.length > 0
      ? await db
          .select({
            accountId: emails.accountId,
            count: sql<number>`count(*)::int`,
          })
          .from(emails)
          .where(inArray(emails.accountId, accountIds))
          .groupBy(emails.accountId)
      : [];

    // Create a map for quick lookup
    const emailCountMap = new Map(emailCounts.map(ec => [ec.accountId, ec.count]));

    // Build account stats without N+1 queries
    const accountsWithStats = accounts.map((account) => {
      const actualEmailCount = emailCountMap.get(account.id) || 0;

      // Calculate sync progress
      const isSyncing = account.syncStatus === 'syncing';
      const isComplete = account.syncStatus === 'active' && !account.syncCursor;

      return {
        id: account.id,
        email: account.emailAddress,
        provider: account.emailProvider,
        syncStatus: account.syncStatus,

        // Email counts
        syncedEmailCount: account.syncedEmailCount || 0, // Counter from sync
        actualEmailCount, // Actual emails in DB

        // Sync progress
        continuationCount: account.continuationCount || 0,
        lastSyncAt: account.lastSyncedAt,
        lastCursor: account.syncCursor ? 'Has cursor (continuing)' : 'No cursor (complete or not started)',

        // Status indicators
        isSyncing,
        isComplete,
        hasError: account.syncStatus === 'error',
        lastError: account.lastError,

        // Estimates
        estimatedSyncTime: account.continuationCount
          ? `~${Math.round((account.continuationCount * 4.5) / 60)} hours elapsed`
          : 'N/A',
      };
    });

    return NextResponse.json({
      success: true,
      accounts: accountsWithStats,
      summary: {
        totalAccounts: accounts.length,
        syncing: accountsWithStats.filter(a => a.isSyncing).length,
        complete: accountsWithStats.filter(a => a.isComplete).length,
        errors: accountsWithStats.filter(a => a.hasError).length,
        totalEmailsInDB: accountsWithStats.reduce((sum, a) => sum + a.actualEmailCount, 0),
      },
    });
  } catch (error) {
    console.error('[Sync Status] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status',
      details: message,
    }, { status: 500 });
  }
}
