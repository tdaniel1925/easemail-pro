import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    console.log(`[Manual Sync] Starting sync for account ${accountId}`, {
      email: account.emailAddress,
      provider: account.emailProvider,
      nylasGrantId: account.nylasGrantId?.substring(0, 15) + '...',
    });

    // Start parallel folder and email sync
    const results = await Promise.allSettled([
      // Sync folders
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/folders/sync?accountId=${accountId}`, {
        method: 'POST',
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(`Folder sync failed: ${error.error || res.statusText}`);
        }
        return await res.json();
      }),

      // Sync messages (unlimited - sync ALL emails like Superhuman/Outlook)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, limit: Infinity, fullSync: true }),
      }).then(async (res) => {
        if (!res.ok) {
          const error = await res.json();
          throw new Error(`Message sync failed: ${error.error || res.statusText}`);
        }
        return await res.json();
      }),
    ]);

    const [folderResult, messageResult] = results;

    const response: any = {
      success: true,
      accountId,
      results: {
        folders: { success: false, error: null, data: null },
        messages: { success: false, error: null, data: null },
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

    // Process message sync result
    if (messageResult.status === 'fulfilled') {
      console.log('[Manual Sync] ✅ Messages synced successfully');
      response.results.messages.success = true;
      response.results.messages.data = messageResult.value;
    } else {
      console.error('[Manual Sync] ❌ Message sync failed:', messageResult.reason);
      response.results.messages.error = messageResult.reason.message || String(messageResult.reason);
    }

    // If both failed, return error status
    if (!response.results.folders.success && !response.results.messages.success) {
      response.success = false;
      response.error = 'Both folder and message sync failed';
      return NextResponse.json(response, { status: 500 });
    }

    // Trigger background sync for remaining emails (don't wait)
    if (response.results.messages.success) {
      console.log('[Manual Sync] 🔄 Triggering background sync...');
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/sync/background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      }).catch(err => console.error('[Manual Sync] ⚠️ Background sync trigger error:', err));
    }

    console.log('[Manual Sync] ✅ Manual sync completed:', {
      foldersSuccess: response.results.folders.success,
      messagesSuccess: response.results.messages.success,
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
