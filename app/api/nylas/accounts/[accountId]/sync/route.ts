import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { retryFetch } from '@/lib/sync/retry-logic';

export const dynamic = 'force-dynamic';

/**
 * Convert technical sync error messages to user-friendly messages
 */
function getUserFriendlySyncError(error: any, provider?: string): string {
  const errorMessage = error?.message?.toLowerCase() || String(error).toLowerCase();

  // Provider-specific errors
  if (provider === 'imap') {
    if (errorMessage.includes('authentication') || errorMessage.includes('auth')) {
      return 'IMAP authentication failed. Your password may have changed. Please reconnect your account.';
    }
    if (errorMessage.includes('connection')) {
      return 'Unable to connect to your IMAP server. Please check your internet connection.';
    }
  }

  if (provider === 'google' || provider === 'microsoft') {
    if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      return 'Your email authorization has expired. Please reconnect your account.';
    }
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return 'Sync temporarily paused due to API limits. Will resume automatically.';
    }
  }

  // Generic errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network error during sync. Please check your connection and try again.';
  }
  if (errorMessage.includes('timeout')) {
    return 'Sync timed out. This is normal for large mailboxes. Click sync to continue.';
  }

  return 'Sync failed. Please try again or contact support if this persists.';
}

/**
 * Manual sync trigger for an email account
 * POST /api/nylas/accounts/[accountId]/sync
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.accountId;

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 403 });
    }

    // ✅ SYNC LOCKING: Prevent concurrent syncs on same account
    if (account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') {
      console.log(`[Manual Sync] ⚠️ Sync already in progress for account ${accountId}`);
      return NextResponse.json({
        error: 'Sync already in progress',
        message: 'A sync is currently running for this account. Please wait for it to complete.',
        syncStatus: account.syncStatus,
      }, { status: 409 }); // 409 Conflict
    }

    console.log(`[Manual Sync] Starting sync for account ${accountId}`, {
      email: account.emailAddress,
      provider: account.emailProvider,
      nylasGrantId: account.nylasGrantId?.substring(0, 15) + '...',
    });

    // ✅ FIXED: Sequential sync - folders BEFORE emails to ensure correct folder assignment
    console.log('[Manual Sync] 📁 Step 1/2: Syncing folders first...');

    // STEP 1: Sync folders first (MUST complete before email sync)
    const folderResponse = await retryFetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/folders/sync?accountId=${accountId}`,
      {
        method: 'POST',
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
      }
    );

    const folderResult: any = { status: 'fulfilled', value: await folderResponse.json() };

    // Check if folder sync succeeded
    if (folderResponse.status !== 200 || !folderResult.value?.success) {
      console.error('[Manual Sync] ❌ Folder sync failed, aborting email sync');
      return NextResponse.json({
        success: false,
        error: 'Folder sync failed',
        details: folderResult.value?.error || 'Unknown error',
        accountId,
      }, { status: 500 });
    }

    console.log('[Manual Sync] ✅ Folders synced successfully');
    console.log('[Manual Sync] 📧 Step 2/2: Starting email sync...');

    // STEP 2: Now sync emails (folders are guaranteed to exist in DB)
    const backgroundSyncResponse = await retryFetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
      }
    );

    const backgroundSyncResult: any = { status: 'fulfilled', value: await backgroundSyncResponse.json() };
    const results = [folderResult, backgroundSyncResult];

    const response: any = {
      success: true,
      accountId,
      results: {
        folders: { success: false, error: null, data: null },
        backgroundSync: { success: false, error: null, data: null },
      },
    };

    // Process folder sync result
    if (folderResult.status === 'fulfilled') {
      console.log('[Manual Sync] ✅ Folders synced successfully');
      response.results.folders.success = true;
      response.results.folders.data = folderResult.value;
    } else {
      console.error('[Manual Sync] ❌ Folder sync failed:', folderResult.reason);
      response.results.folders.error = folderResult.reason.message || String(folderResult.reason);
    }

    // Process background sync result
    if (backgroundSyncResult.status === 'fulfilled') {
      console.log('[Manual Sync] ✅ Background sync started successfully');
      response.results.backgroundSync.success = true;
      response.results.backgroundSync.data = backgroundSyncResult.value;
    } else {
      console.error('[Manual Sync] ❌ Background sync failed:', backgroundSyncResult.reason);
      response.results.backgroundSync.error = backgroundSyncResult.reason.message || String(backgroundSyncResult.reason);
    }

    // If both failed, return error status
    if (!response.results.folders.success && !response.results.backgroundSync.success) {
      response.success = false;
      response.error = 'Both folder and background sync failed';
      return NextResponse.json(response, { status: 500 });
    }

    console.log('[Manual Sync] ✅ Manual sync initiated:', {
      foldersSuccess: response.results.folders.success,
      backgroundSyncSuccess: response.results.backgroundSync.success,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Manual Sync] ❌ Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync account',
      details: error.message,
    }, { status: 500 });
  }
}
