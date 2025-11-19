/**
 * Nylas v3 Messages API Route
 * On-demand message fetching with cursor-based pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchMessages, fetchMessage } from '@/lib/nylas-v3/messages';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/nylas-v3/messages
 * Fetch messages with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const folderId = searchParams.get('folderId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor');
    const unread = searchParams.get('unread');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    // 1. Verify user owns this account
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get account and verify ownership
    // accountId is actually the nylasGrantId, not the database id
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
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

    // 3. Check if this is a virtual folder (v0:accountId:folderName format)
    // OR if this is an IMAP/Aurinko account (they don't use Nylas API)
    const isVirtualFolder = folderId?.startsWith('v0:');
    const isNonNylasAccount = account.emailProvider === 'imap' || account.emailProvider === 'aurinko';
    let result;

    if (isVirtualFolder || isNonNylasAccount) {
      // Parse folder name
      let folderName: string;

      if (isVirtualFolder && folderId) {
        // Virtual folder format: v0:accountId:folderName
        const parts = folderId.split(':');
        folderName = parts[2]?.toLowerCase() || 'inbox';
      } else {
        // For IMAP/Aurinko, folderId is the folder name directly
        folderName = folderId?.toLowerCase() || 'inbox';
      }

      console.log('[Messages] Fetching from local database folder:', folderName, 'Account:', account.emailProvider);

      // Query local database for virtual folders
      const dbMessages = await db.query.emails.findMany({
        where: and(
          eq(emails.accountId, account.id),
          eq(emails.folder, folderName)
        ),
        orderBy: [desc(emails.sentAt)],
        limit,
      });

      // Transform database messages to Nylas format
      result = {
        messages: dbMessages.map((msg: any) => ({
          id: msg.providerMessageId || msg.id,
          grant_id: account.nylasGrantId,
          thread_id: msg.threadId,
          subject: msg.subject,
          from: [{ email: msg.fromEmail, name: msg.fromName }],
          to: msg.toEmails || [],
          cc: msg.ccEmails || [],
          bcc: msg.bccEmails || [],
          date: Math.floor(new Date(msg.sentAt || msg.receivedAt).getTime() / 1000),
          unread: !msg.isRead,
          starred: msg.isStarred,
          snippet: msg.snippet,
          body: msg.bodyHtml || msg.bodyText,
          folders: msg.folders || [folderName],
          attachments: msg.attachments || [],
        })),
        nextCursor: null,
        hasMore: false,
      };
    } else {
      // Fetch from Nylas for real folders
      result = await fetchMessages({
        grantId: account.nylasGrantId,
        folderId: folderId || undefined,
        limit,
        pageToken: cursor || undefined,
        unread: unread === 'true' ? true : unread === 'false' ? false : undefined,
      });
    }

    // 4. Enrich messages with thread email counts from our database
    const enrichedMessages = await Promise.all(
      result.messages.map(async (message: any) => {
        if (message.thread_id) {
          try {
            // Query our email_threads table for the email count
            const { emailThreads } = await import('@/lib/db/schema-threads');
            const { eq } = await import('drizzle-orm');

            const thread = await db.query.emailThreads.findFirst({
              where: eq(emailThreads.id, message.thread_id),
              columns: {
                emailCount: true,
              },
            });

            return {
              ...message,
              threadEmailCount: thread?.emailCount || 1,
            };
          } catch (error) {
            console.error('Error fetching thread count for message:', error);
            return {
              ...message,
              threadEmailCount: 1,
            };
          }
        }
        return message;
      })
    );

    return NextResponse.json({
      success: true,
      messages: enrichedMessages,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error('❌ Messages API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
