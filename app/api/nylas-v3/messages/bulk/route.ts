/**
 * Nylas v3 - Bulk Message Actions
 * Handle bulk operations on multiple messages
 * Includes cache invalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';
import { invalidateMessagesCache } from '@/lib/redis/cache-invalidation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, messageIds, action } = body;

    if (!accountId || !messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Account ID and message IDs array required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action required (delete, archive, markRead, markUnread, star, unstar)' },
        { status: 400 }
      );
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    // Note: accountId is the Nylas grant ID, not the database ID
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    if (!account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Get Nylas client
    const nylas = getNylasClient();

    // 4. Perform bulk action
    const results = {
      success: [] as string[],
      failed: [] as { id: string; error: string }[],
    };

    for (const messageId of messageIds) {
      try {
        switch (action) {
          case 'delete':
            // Delete message
            await nylas.messages.destroy({
              identifier: account.nylasGrantId,
              messageId: messageId,
            });
            results.success.push(messageId);
            break;

          case 'archive':
            // Move to archive folder (if supported by provider)
            // For Gmail: remove inbox label, add archive label
            // For other providers: move to archive folder
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: messageId,
              requestBody: {
                folders: ['archive'],
              },
            });
            results.success.push(messageId);
            break;

          case 'markRead':
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: messageId,
              requestBody: {
                unread: false,
              },
            });
            results.success.push(messageId);
            break;

          case 'markUnread':
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: messageId,
              requestBody: {
                unread: true,
              },
            });
            results.success.push(messageId);
            break;

          case 'star':
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: messageId,
              requestBody: {
                starred: true,
              },
            });
            results.success.push(messageId);
            break;

          case 'unstar':
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: messageId,
              requestBody: {
                starred: false,
              },
            });
            results.success.push(messageId);
            break;

          default:
            results.failed.push({
              id: messageId,
              error: `Unknown action: ${action}`,
            });
        }
      } catch (error) {
        console.error(`[Bulk] Error processing message ${messageId}:`, error);
        results.failed.push({
          id: messageId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`[Bulk] Completed ${action} on ${results.success.length}/${messageIds.length} messages`);

    // Invalidate message cache for this account (all folders) if any operations succeeded
    if (results.success.length > 0) {
      await invalidateMessagesCache(user.id, accountId);
    }

    return NextResponse.json({
      success: true,
      results,
      total: messageIds.length,
      succeeded: results.success.length,
      failed: results.failed.length,
    });
  } catch (error) {
    console.error('[Bulk] Error:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json(
      {
        success: false,
        error: nylasError.message,
        code: nylasError.code,
      },
      { status: nylasError.statusCode || 500 }
    );
  }
}
