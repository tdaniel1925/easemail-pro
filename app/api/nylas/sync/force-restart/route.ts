import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Force restart sync endpoint
 * Bypasses "already syncing" checks and forces a clean restart
 * Use this when sync is stuck in background_syncing but not making progress
 */
export async function POST(request: NextRequest) {
  try {
    const { accountId, fullResync } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    console.log(`🔥 FORCE RESTART requested for account ${accountId} (fullResync: ${fullResync})`);

    // Get account details
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    console.log(`📊 Current status: ${account.syncStatus}`);
    console.log(`📊 Current cursor: ${account.syncCursor?.substring(0, 30)}...`);
    console.log(`📊 Synced count: ${account.syncedEmailCount}`);
    console.log(`📊 Continuation count: ${account.continuationCount}`);

    // Force reset to idle state (allows restart)
    // If fullResync is true, also reset cursor to start from scratch
    await db.update(emailAccounts)
      .set({
        syncStatus: 'idle',
        lastError: null,
        syncStopped: false,
        retryCount: 0,
        lastRetryAt: null,
        // For full resync: reset cursor, counts, and progress to start fresh
        ...(fullResync ? {
          syncCursor: null,
          syncedEmailCount: 0,
          totalEmailCount: 0,
          syncProgress: 0,
          continuationCount: 0,
          initialSyncCompleted: false,
        } : {}),
      })
      .where(eq(emailAccounts.id, accountId));

    console.log(`✅ Reset account ${accountId} to idle state`);

    // Now immediately restart sync
    await db.update(emailAccounts)
      .set({
        syncStatus: 'background_syncing',
        lastActivityAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    console.log(`🔄 Triggering background sync for ${accountId}`);

    // Trigger the background sync via HTTP (most reliable method)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.easemail.app';
    
    try {
      const restartResponse = await fetch(`${appUrl}/api/nylas/sync/background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const restartData = await restartResponse.json();

      return NextResponse.json({
        success: true,
        message: 'Force restart completed',
        accountId,
        resumingFrom: {
          cursor: account.syncCursor?.substring(0, 30) + '...',
          syncedCount: account.syncedEmailCount,
          continuationCount: account.continuationCount,
        },
        syncStarted: restartData.success || false,
        syncMessage: restartData.message,
      });
    } catch (fetchError) {
      console.error('Failed to trigger background sync:', fetchError);
      return NextResponse.json({
        success: true,
        warning: 'Account reset to idle, but failed to trigger background sync. Please manually trigger sync.',
        accountId,
        resumingFrom: {
          cursor: account.syncCursor?.substring(0, 30) + '...',
          syncedCount: account.syncedEmailCount,
          continuationCount: account.continuationCount,
        },
      });
    }
  } catch (error) {
    console.error('Force restart error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to force restart sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

