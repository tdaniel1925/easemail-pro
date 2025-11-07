import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint to check sync status and troubleshoot stalled syncs
 */
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }

  try {
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if sync is actually stalled
    const lastSyncDate = account.lastSyncedAt ? new Date(account.lastSyncedAt) : null;
    const now = new Date();
    const minutesSinceLastSync = lastSyncDate 
      ? Math.round((now.getTime() - lastSyncDate.getTime()) / 60000)
      : null;

    const isStalled = 
      (account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') &&
      minutesSinceLastSync !== null &&
      minutesSinceLastSync > 10; // Stalled if no activity for 10+ minutes

    return NextResponse.json({
      success: true,
      account: {
        id: account.id,
        email: account.emailAddress,
        provider: account.nylasProvider,
      },
      sync: {
        status: account.syncStatus,
        progress: account.syncProgress,
        syncedEmailCount: account.syncedEmailCount,
        totalEmailCount: account.totalEmailCount,
        initialSyncCompleted: account.initialSyncCompleted,
        lastSyncedAt: account.lastSyncedAt,
        minutesSinceLastSync,
      },
      cursor: {
        hasCursor: !!account.syncCursor,
        cursorPreview: account.syncCursor ? account.syncCursor.substring(0, 50) + '...' : null,
      },
      continuation: {
        count: account.continuationCount || 0,
        maxAllowed: 100,
      },
      errors: {
        lastError: account.lastError,
        retryCount: account.retryCount || 0,
        syncStopped: account.syncStopped || false,
      },
      diagnosis: {
        isStalled,
        reason: isStalled 
          ? `No sync activity for ${minutesSinceLastSync} minutes. Sync may be stuck.`
          : account.syncStatus === 'error'
          ? 'Sync failed with error'
          : account.syncStatus === 'idle'
          ? 'Sync is idle/complete'
          : 'Sync appears to be running normally',
        recommendations: isStalled
          ? [
              'Check Vercel logs for errors',
              'Verify continuation mechanism is working',
              'Try restarting sync manually',
              'Check if rate limits are blocking continuation',
            ]
          : account.syncStatus === 'error'
          ? ['Check lastError field', 'Retry sync after fixing error']
          : [],
      },
    });
  } catch (error: any) {
    console.error('Sync diagnostic error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync diagnostics', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Force restart a stalled sync
 */
export async function POST(request: NextRequest) {
  try {
    const { accountId, action } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (action === 'force_restart') {
      console.log(`🔄 Force restarting sync for account ${accountId}`);
      
      // Reset sync state and trigger continuation
      await db.update(emailAccounts)
        .set({
          syncStatus: 'background_syncing',
          syncStopped: false,
          lastError: null,
          retryCount: 0,
        })
        .where(eq(emailAccounts.id, accountId));

      // Trigger continuation
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId }),
        });

        return NextResponse.json({
          success: true,
          message: 'Sync force restarted successfully',
        });
      } catch (err) {
        console.error('Failed to trigger restart:', err);
        return NextResponse.json(
          { error: 'Failed to trigger restart', details: err instanceof Error ? err.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else if (action === 'reset_cursor') {
      console.log(`🔄 Resetting sync cursor for account ${accountId}`);
      
      // Reset cursor to start from beginning
      await db.update(emailAccounts)
        .set({
          syncCursor: null,
          syncStatus: 'idle',
          syncProgress: 0,
          syncedEmailCount: 0,
          continuationCount: 0,
          syncStopped: false,
          lastError: null,
        })
        .where(eq(emailAccounts.id, accountId));

      return NextResponse.json({
        success: true,
        message: 'Sync cursor reset successfully. You can now start a fresh sync.',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Sync force restart error:', error);
    return NextResponse.json(
      { error: 'Failed to force restart sync', details: error.message },
      { status: 500 }
    );
  }
}

