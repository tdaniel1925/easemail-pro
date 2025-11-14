/**
 * Contacts V4 Sync API
 * POST /api/contacts-v4/sync/[accountId] - Trigger manual sync
 * GET /api/contacts-v4/sync/[accountId] - Get sync state
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactSyncState } from '@/lib/db/schema-contacts-v4';
import { eq } from 'drizzle-orm';
import { createContactsSyncService } from '@/lib/services/contacts-v4-sync';
import type { SyncProgressUpdate } from '@/lib/types/contacts-v4';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large syncs

/**
 * POST - Trigger manual sync
 * Supports both streaming (SSE) and non-streaming modes
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { searchParams } = new URL(request.url);
  const isStreaming = searchParams.get('stream') === 'true';
  const forceFullSync = searchParams.get('full') === 'true';

  if (isStreaming) {
    return streamingSync(params.accountId, forceFullSync);
  } else {
    return regularSync(params.accountId, forceFullSync);
  }
}

/**
 * GET - Get sync state OR trigger streaming sync
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { searchParams } = new URL(request.url);
  const isStreaming = searchParams.get('stream') === 'true';
  const forceFullSync = searchParams.get('full') === 'true';

  // If streaming is requested, use SSE sync
  if (isStreaming) {
    return streamingSync(params.accountId, forceFullSync);
  }

  // Otherwise, return sync state as JSON
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get sync state from database
    const syncState = await db.query.contactSyncState.findFirst({
      where: eq(contactSyncState.accountId, params.accountId),
    });

    if (!syncState) {
      return NextResponse.json({
        success: true,
        sync_state: {
          status: 'idle',
          total_contacts: 0,
          last_sync: null,
          sync_enabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      sync_state: {
        status: syncState.syncStatus,
        total_contacts: syncState.totalContacts,
        synced_contacts: syncState.syncedContacts,
        pending_contacts: syncState.pendingContacts,
        error_contacts: syncState.errorContacts,
        conflict_contacts: syncState.conflictContacts,
        last_successful_sync: syncState.lastSuccessfulSync,
        last_sync_attempt: syncState.lastSyncAttempt,
        current_operation: syncState.currentOperation,
        progress_percentage: syncState.progressPercentage,
        sync_error: syncState.syncError,
        sync_enabled: syncState.syncEnabled,
        auto_sync: syncState.autoSync,
      },
    });
  } catch (error: any) {
    console.error('❌ Get sync state error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync state' },
      { status: 500 }
    );
  }
}

// ============================================
// STREAMING SYNC (with Server-Sent Events)
// ============================================

async function streamingSync(accountId: string, forceFullSync: boolean) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          sendSSE(controller, encoder, { type: 'error', error: 'Unauthorized' });
          controller.close();
          return;
        }

        // Get account details
        const { data: account } = await supabase
          .from('email_accounts')
          .select('nylas_grant_id, email')
          .eq('id', accountId)
          .single();

        if (!account || !account.nylas_grant_id) {
          sendSSE(controller, encoder, {
            type: 'error',
            error: 'Account not found or not connected',
          });
          controller.close();
          return;
        }

        // Determine provider from email domain
        const provider = account.email?.includes('@gmail.com') ||
          account.email?.includes('@googlemail.com')
          ? 'google'
          : 'microsoft';

        // Create sync service with progress callback
        const syncService = createContactsSyncService({
          accountId,
          userId: user.id,
          grantId: account.nylas_grant_id,
          provider,
          onProgress: (update: SyncProgressUpdate) => {
            sendSSE(controller, encoder, update);
          },
        });

        // Perform sync
        const result = await syncService.sync(forceFullSync);

        // Send final result
        sendSSE(controller, encoder, {
          type: 'complete',
          ...result,
        });

        controller.close();
      } catch (error: any) {
        console.error('❌ Streaming sync error:', error);
        sendSSE(controller, encoder, {
          type: 'error',
          error: error.message || 'Sync failed',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// ============================================
// REGULAR SYNC (non-streaming)
// ============================================

async function regularSync(accountId: string, forceFullSync: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account details
    const { data: account } = await supabase
      .from('email_accounts')
      .select('nylas_grant_id, email')
      .eq('id', accountId)
      .single();

    if (!account || !account.nylas_grant_id) {
      return NextResponse.json(
        { error: 'Account not found or not connected' },
        { status: 404 }
      );
    }

    // Determine provider from email domain
    const provider = account.email?.includes('@gmail.com') ||
      account.email?.includes('@googlemail.com')
      ? 'google'
      : 'microsoft';

    // Create sync service
    const syncService = createContactsSyncService({
      accountId,
      userId: user.id,
      grantId: account.nylas_grant_id,
      provider,
    });

    // Perform sync
    const result = await syncService.sync(forceFullSync);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Regular sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Sync failed',
      },
      { status: 500 }
    );
  }
}

// ============================================
// HELPERS
// ============================================

function sendSSE(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: any
) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(message));
}
