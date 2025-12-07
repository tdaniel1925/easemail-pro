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
        // Count actual emails in database for this account
        const [emailCountResult] = await db
          .select({ count: count() })
          .from(emails)
          .where(eq(emails.accountId, account.id));

        const actualEmailCount = emailCountResult?.count || 0;

        // Use the actual count if syncedEmailCount is 0 or missing
        const syncedEmailCount = account.syncedEmailCount || actualEmailCount;

        // Determine effective sync status
        let effectiveSyncStatus = account.syncStatus || 'idle';
        let effectiveSyncProgress = account.syncProgress || 0;

        // If we have emails but status shows idle/0%, update to show completed
        if (actualEmailCount > 0 && effectiveSyncStatus === 'idle' && effectiveSyncProgress === 0) {
          // Account has emails but sync stats weren't updated - treat as completed
          effectiveSyncStatus = 'completed';
          effectiveSyncProgress = 100;
        }

        // If totalEmailCount is 0 but we have synced emails, use synced as total
        const totalEmailCount = account.totalEmailCount || syncedEmailCount || actualEmailCount;

        // Recalculate progress if needed
        if (totalEmailCount > 0 && syncedEmailCount > 0 && effectiveSyncProgress === 0) {
          effectiveSyncProgress = Math.min(100, Math.round((syncedEmailCount / totalEmailCount) * 100));
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

