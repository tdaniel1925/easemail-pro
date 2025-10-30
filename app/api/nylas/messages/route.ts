import { NextRequest, NextResponse } from 'next/server';
import { nylas } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails, syncLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET: Fetch messages for an account
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  const folderId = request.nextUrl.searchParams.get('folderId');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
  
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }
  
  try {
    // Get messages from database
    const messages = await db.query.emails.findMany({
      where: eq(emails.accountId, accountId),
      limit,
      offset,
      orderBy: [desc(emails.receivedAt)],
    });
    
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

// POST: Sync messages from Nylas
export async function POST(request: NextRequest) {
  const { accountId, limit = 50, fullSync = false } = await request.json();
  
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }
  
  try {
    // Get account
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });
    
    if (!account || !account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // Create sync log
    const [syncLog] = await db.insert(syncLogs).values({
      accountId: account.id,
      syncType: fullSync ? 'full' : 'delta',
      status: 'started',
    }).returning();
    
    // Fetch messages from Nylas
    const queryParams: any = { limit };
    
    // Use cursor for delta sync
    if (!fullSync && account.syncCursor) {
      queryParams.pageToken = account.syncCursor;
    }
    
    // For initial sync, only get last 7 days
    if (fullSync && !account.initialSyncCompleted) {
      const oneWeekAgo = Math.floor((Date.now() - (7 * 24 * 60 * 60 * 1000)) / 1000);
      queryParams.receivedAfter = oneWeekAgo;
    }
    
    const response = await nylas.messages.list({
      identifier: account.nylasGrantId,
      queryParams,
    });
    
    let syncedCount = 0;
    
    // Sync each message to database
    for (const message of response.data) {
      try {
        // Check if message exists
        const existing = await db.query.emails.findFirst({
          where: eq(emails.providerMessageId, message.id),
        });

        if (existing) {
          // Update existing message
          await db.update(emails)
            .set({
              isRead: message.unread === false,
              isStarred: message.starred === true,
              folder: message.folders?.[0] || 'inbox',
              folders: message.folders || [],
              updatedAt: new Date(),
            })
            .where(eq(emails.id, existing.id));
        } else {
          // Insert new message
          // Map attachments to ensure required fields are present
          const mappedAttachments = message.attachments?.map((att: any) => ({
            id: att.id || '',
            filename: att.filename || 'untitled',
            size: att.size || 0, // Default to 0 if size is undefined
            contentType: att.contentType || 'application/octet-stream',
            contentId: att.contentId,
            url: att.url,
            providerFileId: att.id,
          })) || [];

          await db.insert(emails).values({
            accountId: account.id,
            provider: 'nylas',
            providerMessageId: message.id,
            threadId: message.threadId,
            providerThreadId: message.threadId,
            subject: message.subject || '',
            snippet: message.snippet || '',
            fromEmail: message.from?.[0]?.email || '',
            fromName: message.from?.[0]?.name || '',
            toEmails: message.to || [],
            ccEmails: message.cc || [],
            bccEmails: message.bcc || [],
            hasAttachments: (message.attachments?.length || 0) > 0,
            attachmentsCount: message.attachments?.length || 0,
            attachments: mappedAttachments,
            isRead: message.unread === false,
            isStarred: message.starred === true,
            folder: message.folders?.[0] || 'inbox',
            folders: message.folders || [],
            receivedAt: new Date(message.date * 1000),
            providerData: message as any,
          }).onConflictDoNothing(); // Ignore duplicates silently
        }
        syncedCount++;
      } catch (messageError) {
        console.error('Error syncing message:', message.id, messageError);
      }
    }
    
    // Update sync cursor
    const nextCursor = (response as any).nextCursor;
    
    // Update account
    await db.update(emailAccounts)
      .set({
        syncCursor: nextCursor,
        lastSyncedAt: new Date(),
        syncStatus: 'active',
        initialSyncCompleted: true,
      })
      .where(eq(emailAccounts.id, account.id));
    
    // Update sync log
    await db.update(syncLogs)
      .set({
        status: 'completed',
        messagesSynced: syncedCount,
        completedAt: new Date(),
      })
      .where(eq(syncLogs.id, syncLog.id));
    
    return NextResponse.json({ 
      success: true, 
      messagesSynced: syncedCount,
      hasMore: !!nextCursor,
      nextCursor,
    });
  } catch (error) {
    console.error('Message sync error:', error);
    return NextResponse.json({ 
      error: 'Sync failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

