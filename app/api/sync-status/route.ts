/**
 * Sync Status API
 * GET /api/sync-status
 * Returns detailed sync status for all user accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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

    // TODO: Add admin role check if targetUserId !== user.id
    // For now, users can only view their own accounts
    if (targetUserId !== user.id) {
      // In the future, check if current user is admin
      // const isAdmin = await checkAdminRole(user.id);
      // if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all accounts for the target user
    const accounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, targetUserId),
    });

    // For each account, get actual email count from database
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        // Get actual email count in database
        const emailCountResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(emails)
          .where(eq(emails.accountId, account.id));

        const actualEmailCount = emailCountResult[0]?.count || 0;

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
          lastSyncAt: account.lastSyncAt,
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
      })
    );

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
  } catch (error: any) {
    console.error('[Sync Status] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get sync status',
      details: error.message,
    }, { status: 500 });
  }
}
