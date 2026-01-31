import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all accounts for user
    const accounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, user.id),
      orderBy: (accounts, { desc }) => [desc(accounts.isDefault), desc(accounts.createdAt)],
    });

    // For each account, get actual email count from database
    const accountsWithRealCounts = await Promise.all(
      accounts.map(async (account) => {
        // Count ALL emails in database for this account (including archived, trashed, etc.)
        // This should match the total that was synced
        const emailCountResult = await db.execute(sql`
          SELECT COUNT(*)::int as count FROM emails WHERE account_id = ${account.id}
        `);

        // Extract count from result (drizzle returns array-like RowList)
        let actualEmailCount = 0;
        const resultArray = emailCountResult as unknown as Array<{ count: number }>;
        if (resultArray && resultArray.length > 0) {
          actualEmailCount = Number(resultArray[0].count) || 0;
        }

        // Debug: log the count for this account
        console.log(`📊 Account ${account.emailAddress} (ID: ${account.id}): ${actualEmailCount} emails in DB, syncedEmailCount: ${account.syncedEmailCount}`);

        // ✅ FIXED: Simplified status logic - trust the database, don't guess

        // Use actual synced count from DB if available, otherwise use stored value
        const syncedEmailCount = account.syncedEmailCount || actualEmailCount;

        // Use stored total from Nylas, fallback to synced count if not yet fetched
        const totalEmailCount = account.totalEmailCount || syncedEmailCount || actualEmailCount;

        // Calculate progress based on actual counts
        let calculatedProgress = 0;
        if (totalEmailCount > 0) {
          calculatedProgress = Math.min(100, Math.round((syncedEmailCount / totalEmailCount) * 100));
        }

        // Trust the stored sync status from DB (set by sync processes)
        // Only override if status is obviously stale (completed but progress < 100)
        let effectiveSyncStatus = account.syncStatus || 'idle';
        let effectiveSyncProgress = account.syncProgress || calculatedProgress;

        // Only adjust status if there's a clear mismatch
        if (effectiveSyncStatus === 'completed' && effectiveSyncProgress < 100 && syncedEmailCount < totalEmailCount) {
          // Sync marked complete but isn't - probably stalled
          effectiveSyncStatus = 'idle';
        }

        // If account is inactive or has errors, reflect that
        if (!account.isActive) {
          effectiveSyncStatus = 'error';
        }

        return {
          ...account,
          syncedEmailCount: syncedEmailCount,
          totalEmailCount: totalEmailCount,
          syncStatus: effectiveSyncStatus,
          syncProgress: effectiveSyncProgress,
          actualEmailCount, // Include for debugging
        };
      })
    );

    return NextResponse.json({ success: true, accounts: accountsWithRealCounts });
  } catch (error) {
    console.error('Accounts fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

