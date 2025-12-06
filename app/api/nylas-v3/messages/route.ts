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
    // accountId could be either nylasGrantId (for Nylas accounts) or database ID (for IMAP accounts)
    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    // If not found by nylasGrantId, try by database ID (for IMAP accounts)
    if (!account) {
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
    }

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

    const isIMAPAccount = account.provider === 'imap';
    const isJMAPAccount = account.provider === 'jmap';
    const isDirectAccount = isIMAPAccount || isJMAPAccount;

    // Nylas accounts require nylasGrantId
    if (!isDirectAccount && !account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Determine message source: IMAP/JMAP/virtual folders use local DB, Nylas uses API
    const isVirtualFolder = folderId?.startsWith('v0:');
    const useLocalDatabase = isDirectAccount || isVirtualFolder;
    let result;

    if (useLocalDatabase) {
      // Determine folder name (normalized)
      let folderName: string;

      if (isVirtualFolder) {
        // Parse folder name from virtual folder format: v0:accountId:folderName
        const parts = folderId!.split(':');
        folderName = parts[2]?.toLowerCase() || 'inbox';
      } else if (folderId) {
        // For IMAP accounts, folderId is the database folder ID (UUID)
        // Look up the folder to get the normalized folderType
        const { emailFolders: emailFoldersSchema } = await import('@/lib/db/schema');
        const folder = await db.query.emailFolders.findFirst({
          where: eq(emailFoldersSchema.id, folderId),
        });

        if (!folder) {
          return NextResponse.json(
            { error: 'Folder not found' },
            { status: 404 }
          );
        }

        // Use folderType (normalized: inbox, sent, trash, etc.)
        folderName = folder.folderType || 'inbox';
        console.log(`[Messages] Folder lookup: ID=${folderId} → Type=${folderName}, Display=${folder.displayName}`);
      } else {
        // No folder specified, default to inbox
        folderName = 'inbox';
      }

      // Parse cursor for offset-based pagination (cursor is the offset number as string)
      const offset = cursor ? parseInt(cursor, 10) : 0;

      console.log('[Messages] Fetching from local database - Folder:', folderName, 'Account:', account.emailProvider, 'Provider:', account.provider, 'Offset:', offset, 'Limit:', limit);

      // Query local database - OPTIMIZED: Don't fetch body for list view (save bandwidth)
      // Body is fetched separately when user opens an email
      // Fetch limit + 1 to check if there are more emails
      const dbMessages = await db.select({
        id: emails.id,
        providerMessageId: emails.providerMessageId,
        accountId: emails.accountId,
        threadId: emails.threadId,
        subject: emails.subject,
        fromEmail: emails.fromEmail,
        fromName: emails.fromName,
        toEmails: emails.toEmails,
        ccEmails: emails.ccEmails,
        bccEmails: emails.bccEmails,
        sentAt: emails.sentAt,
        receivedAt: emails.receivedAt,
        isRead: emails.isRead,
        isStarred: emails.isStarred,
        snippet: emails.snippet,
        // NOTE: bodyHtml and bodyText excluded for performance - fetch via /messages/[id] when needed
        folder: emails.folder,
        folders: emails.folders,
        attachments: emails.attachments,
      })
        .from(emails)
        .where(and(
          eq(emails.accountId, account.id),
          eq(emails.folder, folderName)
        ))
        .orderBy(desc(emails.sentAt))
        .limit(limit + 1) // Fetch one extra to check if there are more
        .offset(offset);

      // Check if there are more emails
      const hasMore = dbMessages.length > limit;
      const messagesToReturn = hasMore ? dbMessages.slice(0, limit) : dbMessages;
      const nextOffset = hasMore ? offset + limit : null;

      console.log(`[Messages] Found ${messagesToReturn.length} emails in local database for folder: ${folderName}, hasMore: ${hasMore}`);

      // Transform database messages to Nylas format
      result = {
        messages: messagesToReturn.map((msg: any) => {
          // Ensure date is valid
          const messageDate = msg.sentAt || msg.receivedAt || new Date();
          const timestamp = Math.floor(new Date(messageDate).getTime() / 1000);

          return {
            // IMPORTANT: Use database ID consistently for JMAP/IMAP messages
            // The detail API (/messages/[messageId]) looks up by database ID first
            id: msg.id,
            providerMessageId: msg.providerMessageId, // Keep for reference
            grant_id: account.nylasGrantId || account.id,
            accountId: msg.accountId, // Include accountId for client-side full body fetch
            thread_id: msg.threadId,
            subject: msg.subject || '(No Subject)',
            from: [{
              email: msg.fromEmail || 'unknown@unknown.com',
              name: msg.fromName || msg.fromEmail || 'Unknown'
            }],
            to: Array.isArray(msg.toEmails) ? msg.toEmails : [],
            cc: Array.isArray(msg.ccEmails) ? msg.ccEmails : [],
            bcc: Array.isArray(msg.bccEmails) ? msg.bccEmails : [],
            date: timestamp,
            unread: !msg.isRead,
            starred: msg.isStarred || false,
            snippet: msg.snippet || '',
            // body excluded from list view for performance - fetch via /messages/[id]
            folders: Array.isArray(msg.folders) ? msg.folders : [folderName],
            attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
          };
        }),
        nextCursor: nextOffset !== null ? String(nextOffset) : null,
        hasMore: hasMore,
      };
    } else {
      // Fetch from Nylas API for Nylas accounts
      result = await fetchMessages({
        grantId: account.nylasGrantId!,
        folderId: folderId || undefined,
        limit,
        pageToken: cursor || undefined,
        unread: unread === 'true' ? true : unread === 'false' ? false : undefined,
      });
    }

    // 4. Optimize: Skip thread enrichment for now (causing N+1 queries and slowness)
    // TODO: Batch query thread counts if needed in future
    // For now, just return messages as-is with default threadEmailCount
    const enrichedMessages = result.messages.map((message: any) => ({
      ...message,
      threadEmailCount: message.threadEmailCount || 1, // Default to 1
    }));

    // Return with cache headers for instant subsequent loads
    return NextResponse.json({
      success: true,
      messages: enrichedMessages,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    }, {
      headers: {
        // Cache for 30 seconds, serve stale while revalidating for 60 seconds
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      }
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
