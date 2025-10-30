import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Nylas from 'nylas';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI!,
});

// POST: Start or continue background sync
export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    console.log(`🔄 Starting background sync for account ${accountId}`);

    // Get account details
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if already syncing
    if (account.syncStatus === 'syncing' || account.syncStatus === 'background_syncing') {
      console.log(`⏭️ Account ${accountId} is already syncing`);
      return NextResponse.json({ 
        success: true, 
        message: 'Sync already in progress',
        progress: account.syncProgress || 0
      });
    }

    // Update status to background_syncing
    await db.update(emailAccounts)
      .set({
        syncStatus: 'background_syncing',
        lastError: null,
      })
      .where(eq(emailAccounts.id, accountId));

    // Start the background sync (don't await - runs in background)
    performBackgroundSync(accountId, account.nylasGrantId!, account.syncCursor).catch(err => {
      console.error(`❌ Background sync error for ${accountId}:`, err);
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Background sync started',
      progress: account.syncProgress || 0
    });
  } catch (error) {
    console.error('Background sync initiation error:', error);
    return NextResponse.json({ error: 'Failed to start background sync' }, { status: 500 });
  }
}

// GET: Check sync status
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

    return NextResponse.json({
      success: true,
      syncStatus: account.syncStatus,
      progress: account.syncProgress || 0,
      totalEmailCount: account.totalEmailCount || 0,
      syncedEmailCount: account.syncedEmailCount || 0,
      lastSyncedAt: account.lastSyncedAt,
      initialSyncCompleted: account.initialSyncCompleted,
    });
  } catch (error) {
    console.error('Sync status check error:', error);
    return NextResponse.json({ error: 'Failed to check sync status' }, { status: 500 });
  }
}

// Background sync function with pagination
async function performBackgroundSync(
  accountId: string, 
  grantId: string, 
  startingCursor: string | null = null
) {
  console.log(`📧 Starting background email sync for account ${accountId}`);
  
  let pageToken: string | undefined = startingCursor || undefined;
  let totalSynced = 0;
  const pageSize = 200; // Sync 200 emails per batch
  const maxPages = 250; // Max 50,000 emails (250 pages × 200)
  let currentPage = 0;

  try {
    // Get current synced count
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    let syncedCount = account?.syncedEmailCount || 0;

    while (currentPage < maxPages) {
      currentPage++;
      console.log(`📄 Fetching page ${currentPage} for account ${accountId}`);

      try {
        // Fetch messages from Nylas
        const response = await nylas.messages.list({
          identifier: grantId,
          queryParams: {
            limit: pageSize,
            page_token: pageToken,
          },
        });

        const messages = response.data;
        
        if (!messages || messages.length === 0) {
          console.log(`✅ No more messages to sync for account ${accountId}`);
          break;
        }

        console.log(`💾 Syncing ${messages.length} emails (Page ${currentPage})`);

        // Insert or update emails in database
        for (const message of messages) {
          try {
            // Check if email already exists
            const existing = await db.query.emails.findFirst({
              where: eq(emails.providerMessageId, message.id),
            });

            if (existing) {
              console.log(`⏭️ Email ${message.id} already exists, skipping`);
              continue;
            }

            // Insert new email
            await db.insert(emails).values({
              accountId: accountId,
              provider: 'nylas',
              providerMessageId: message.id,
              messageId: message.object === 'message' ? message.id : undefined,
              threadId: message.threadId,
              providerThreadId: message.threadId,
              folder: message.folders?.[0] || 'inbox',
              folders: message.folders || [],
              fromEmail: message.from?.[0]?.email,
              fromName: message.from?.[0]?.name,
              toEmails: message.to?.map(t => ({ email: t.email, name: t.name })),
              ccEmails: message.cc?.map(c => ({ email: c.email, name: c.name })),
              bccEmails: message.bcc?.map(b => ({ email: b.email, name: b.name })),
              subject: message.subject,
              snippet: message.snippet,
              body: message.body || '',
              receivedAt: message.date ? new Date(message.date * 1000) : new Date(),
              sentAt: message.date ? new Date(message.date * 1000) : new Date(),
              isRead: !message.unread,
              isStarred: message.starred || false,
              hasAttachments: (message.attachments?.length || 0) > 0,
              attachments: message.attachments || [],
            });

            totalSynced++;
            syncedCount++;
          } catch (emailError) {
            console.error(`❌ Error syncing email ${message.id}:`, emailError);
            // Continue with next email
          }
        }

        // Update sync progress
        const progress = Math.min(Math.round((currentPage / maxPages) * 100), 99);
        await db.update(emailAccounts)
          .set({
            syncedEmailCount: syncedCount,
            syncProgress: progress,
            syncCursor: response.nextCursor || null,
            lastSyncedAt: new Date(),
          })
          .where(eq(emailAccounts.id, accountId));

        console.log(`📊 Progress: ${progress}% (${syncedCount} emails synced)`);

        // Check for next page
        if (!response.nextCursor) {
          console.log(`✅ Reached end of messages for account ${accountId}`);
          break;
        }

        pageToken = response.nextCursor;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (pageError) {
        console.error(`❌ Error fetching page ${currentPage}:`, pageError);
        
        // Update error status
        await db.update(emailAccounts)
          .set({
            syncStatus: 'error',
            lastError: pageError instanceof Error ? pageError.message : 'Unknown error',
          })
          .where(eq(emailAccounts.id, accountId));
        
        throw pageError;
      }
    }

    // Mark sync as completed
    await db.update(emailAccounts)
      .set({
        syncStatus: 'completed',
        syncProgress: 100,
        initialSyncCompleted: true,
        totalEmailCount: syncedCount,
        lastSyncedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    console.log(`✅ Background sync completed for account ${accountId}. Total synced: ${totalSynced} emails`);
  } catch (error) {
    console.error(`❌ Background sync failed for account ${accountId}:`, error);
    
    await db.update(emailAccounts)
      .set({
        syncStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(emailAccounts.id, accountId));
  }
}

