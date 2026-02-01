import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails, emailFolders } from '@/lib/db/schema';
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

    // ✅ FIX: Batch all stats queries in ONE database roundtrip
    // Get all email counts for all accounts in a single query
    const allEmailCounts = await db
      .select({
        accountId: emails.accountId,
        count: count()
      })
      .from(emails)
      .where(sql`${emails.accountId} IN (${sql.join(accounts.map(a => sql`${a.id}`), sql`, `)})`)
      .groupBy(emails.accountId);

    // Get all folder counts for all accounts in a single query
    const allFolderCounts = await db
      .select({
        accountId: emailFolders.accountId,
        count: count()
      })
      .from(emailFolders)
      .where(sql`${emailFolders.accountId} IN (${sql.join(accounts.map(a => sql`${a.id}`), sql`, `)})`)
      .groupBy(emailFolders.accountId);

    // Create lookup maps for O(1) access
    const emailCountMap = new Map(allEmailCounts.map(row => [row.accountId, row.count]));
    const folderCountMap = new Map(allFolderCounts.map(row => [row.accountId, row.count]));

    // Map accounts with stats (now using pre-fetched data)
    const accountsWithStats = accounts.map((account) => {
      const actualEmailCount = emailCountMap.get(account.id) || 0;
      const folderCount = folderCountMap.get(account.id) || 0;

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

      // Normalize provider field
      const provider = account.nylasProvider || account.emailProvider || account.provider || 'unknown';

      return {
        ...account,
        // Normalized fields
        provider,
        // Stats (now included in main response)
        emailCount: actualEmailCount,
        folderCount,
        syncedEmailCount,
        totalEmailCount,
        syncStatus: effectiveSyncStatus,
        syncProgress: effectiveSyncProgress,
        actualEmailCount, // Keep for debugging
      };
    });

    console.log(`📊 Fetched ${accounts.length} accounts with stats in 3 queries (was ${accounts.length + 1} queries)`);

    return NextResponse.json({ success: true, accounts: accountsWithStats });
  } catch (error) {
    console.error('Accounts fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

