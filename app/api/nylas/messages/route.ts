import { NextRequest, NextResponse } from 'next/server';
import { nylas } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails, syncLogs } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { RuleEngine } from '@/lib/rules/rule-engine';
import { retryWithBackoff } from '@/lib/email/retry-utils';
import { checkConnectionHealth } from '@/lib/email/health-check';
import { extractAndSaveAttachments } from '@/lib/attachments/extract-from-email';
import { sanitizeText, sanitizeParticipants } from '@/lib/utils/text-sanitizer';
import { createClient } from '@/lib/supabase/server'; // ✅ FIX #5: Import Supabase for auth

// Enable Node.js runtime for better performance
export const runtime = 'nodejs';
// Cache responses for 5 seconds to reduce database load
export const revalidate = 5;

// GET: Fetch messages for an account
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  const folder = request.nextUrl.searchParams.get('folder');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
  
  if (!accountId) {
    return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
  }
  
  try {
    // ✅ FIX #5: Validate account ownership for security
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('❌ Unauthorized: No user session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check that the account belongs to this user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });
    
    if (!account) {
      console.error('❌ Account not found:', accountId);
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    if (account.userId !== user.id) {
      console.error('❌ Unauthorized: Account does not belong to user', {
        accountUserId: account.userId,
        requestUserId: user.id,
      });
      return NextResponse.json({ error: 'Unauthorized access to account' }, { status: 403 });
    }
    
    console.log('✅ Security validation passed for user:', user.id, 'account:', accountId);
    // Determine which date field to sort by based on folder
    const isSentFolder = folder?.toLowerCase().includes('sent');
    const sortByDate = isSentFolder ? emails.sentAt : emails.receivedAt;
    
    // Build WHERE clause with proper filtering
    let whereClause;
    
    // ✅ IMPROVEMENT: Handle "Inbox" explicitly + case-insensitive comparison
    if (folder && folder.toLowerCase() === 'inbox') {
      // Inbox folder - show all non-trashed, non-archived emails
      console.log('📥 Filtering for Inbox (excluding trash/archive)');
      whereClause = sql`${emails.accountId} = ${accountId} 
        AND ${emails.isTrashed} = false 
        AND ${emails.isArchived} = false`;
    } else if (folder) {
      // ✅ IMPROVEMENT: Case-insensitive folder comparison for reliability
      console.log(`📁 Filtering for folder: "${folder}" (case-insensitive)`);
      whereClause = sql`${emails.accountId} = ${accountId} AND LOWER(${emails.folder}) = LOWER(${folder})`;
    } else {
      // No folder specified - default Inbox view
      console.log('📥 No folder specified, defaulting to Inbox view');
      whereClause = sql`${emails.accountId} = ${accountId} 
        AND ${emails.isTrashed} = false 
        AND ${emails.isArchived} = false`;
    }
    
    // Get messages from database
    const messages = await db.query.emails.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(sortByDate)],
    });
    
    console.log(`📧 Fetched ${messages.length} emails for account ${accountId}${folder ? ` in folder ${folder}` : ' (inbox, excluding trash/archive)'}`);
    console.log(`📅 Sorting by: ${isSentFolder ? 'sentAt' : 'receivedAt'}`);
    if (messages.length > 0) {
      const dateField = isSentFolder ? 'sentAt' : 'receivedAt';
      console.log('📅 Date range:', {
        newest: messages[0][dateField],
        oldest: messages[messages.length - 1][dateField]
      });
    }
    
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
      console.error('❌ Account not found or missing grant ID:', { accountId, hasAccount: !!account, hasGrantId: !!account?.nylasGrantId });
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    // ✅ LAYER 3: Pre-sync token validation (refresh if expires within 48 hours)
    const tokenExpiresAt = account.tokenExpiresAt 
      ? new Date(account.tokenExpiresAt) 
      : null;
    
    if (tokenExpiresAt) {
      const hoursUntilExpiry = 
        (tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
      
      if (hoursUntilExpiry < 48) {
        console.log(`🔑 Token expires in ${Math.round(hoursUntilExpiry)}h - refreshing before sync`);
        
        // Silently attempt refresh (don't block sync if it fails)
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/nylas/token-refresh`, { 
            method: 'POST' 
          });
        } catch (refreshError) {
          // Only fail sync if token is ACTUALLY expired
          if (hoursUntilExpiry < 0) {
            console.error('❌ Token expired and refresh failed');
            return NextResponse.json({
              error: 'Please reconnect your account',
              requiresReconnect: true
            }, { status: 401 });
          }
          // Otherwise continue - token still valid
          console.log('⚠️ Token refresh failed but token still valid, continuing sync');
        }
      }
    }
    
    console.log('📧 Starting email sync for account:', {
      accountId,
      email: account.emailAddress,
      grantId: account.nylasGrantId,
      fullSync,
      limit,
      provider: account.emailProvider,
    });
    
    // Dev environment: Add small delay after server restart
    if (process.env.NODE_ENV === 'development') {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Health check before syncing
    console.log('🏥 Checking connection health...');
    const health = await checkConnectionHealth(account.nylasGrantId);
    
    if (!health.canSync) {
      console.warn('⚠️ Health check failed:', health.reason);
      
      // Update account with helpful message
      await db.update(emailAccounts)
        .set({
          syncStatus: 'error',
          lastError: `${health.reason}. ${health.suggestion}`,
        })
        .where(eq(emailAccounts.id, accountId));
      
      return NextResponse.json({ 
        error: health.reason,
        suggestion: health.suggestion,
        canRetry: !health.reason?.includes('Authentication'),
      }, { status: 503 });
    }
    
    console.log('✅ Health check passed');
    
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
    
    // ✅ FIX #1: Configurable initial sync window (default 90 days, or all time)
    if (fullSync && !account.initialSyncCompleted) {
      const SYNC_HISTORY_DAYS = process.env.SYNC_HISTORY_DAYS 
        ? parseInt(process.env.SYNC_HISTORY_DAYS) 
        : 90; // Default to 90 days instead of 7
      
      if (SYNC_HISTORY_DAYS > 0) {
        const historyStart = Math.floor((Date.now() - (SYNC_HISTORY_DAYS * 24 * 60 * 60 * 1000)) / 1000);
        queryParams.receivedAfter = historyStart;
        console.log(`📅 Initial sync - fetching emails from last ${SYNC_HISTORY_DAYS} days`);
      } else {
        console.log('📅 Initial sync - fetching ALL historical emails (no time limit)');
      }
    }
    
    console.log('🔍 Fetching messages from Nylas with params:', queryParams);
    
    // ✅ Fetch messages with automatic retry (works for ALL providers: Google, Microsoft, IMAP)
    const response = await retryWithBackoff(
      async () => await nylas.messages.list({
        identifier: account.nylasGrantId!,  // Already checked above
        queryParams,
      }),
      {
        maxRetries: 3,
        initialDelay: 1000, // 1s, 2s, 4s exponential backoff
        onRetry: (attempt, error) => {
          console.log(`⏳ Retry attempt ${attempt}/3 for ${account.emailProvider}: ${error.message}`);
        },
      }
    );
    
    console.log('✅ Received messages from Nylas:', {
      count: response.data.length,
      hasMore: !!(response as any).nextCursor,
      provider: account.emailProvider,
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
          // Map attachments to ensure required fields are present and sanitize all text
          const mappedAttachments = message.attachments?.map((att: any) => ({
            id: sanitizeText(att.id) || '',
            filename: sanitizeText(att.filename) || 'untitled',
            size: att.size || 0, // Default to 0 if size is undefined
            contentType: sanitizeText(att.contentType) || 'application/octet-stream',
            contentId: sanitizeText(att.contentId),
            url: sanitizeText(att.url),
            providerFileId: sanitizeText(att.id),
          })) || [];

          // ✅ FIX: Check if this is a sent message (from account owner)
          const isFromAccountOwner = message.from?.[0]?.email?.toLowerCase() === account.emailAddress?.toLowerCase();
          
          // Check if message is in any "sent" folder (handles various naming conventions)
          const isInSentFolder = message.folders?.some((f: string) => 
            f.toLowerCase().includes('sent') || 
            f.toLowerCase().includes('enviados') || // Spanish
            f.toLowerCase().includes('skickat')    // Swedish
          ) || false;
          
          // Determine folder: If from account owner AND in sent folder, use 'sent'
          // Otherwise use first folder or default to 'inbox'
          const messageFolder = isFromAccountOwner && isInSentFolder
            ? 'sent' 
            : message.folders?.[0] || 'inbox';

          console.log(`📧 Message analysis:`, {
            from: message.from?.[0]?.email,
            accountEmail: account.emailAddress,
            isFromAccountOwner,
            folders: message.folders,
            isInSentFolder,
            determinedFolder: messageFolder,
            subject: message.subject?.substring(0, 50),
          });

          await db.insert(emails).values({
            accountId: account.id,
            provider: 'nylas',
            providerMessageId: sanitizeText(message.id),
            threadId: sanitizeText(message.threadId),
            providerThreadId: sanitizeText(message.threadId),
            subject: sanitizeText(message.subject),
            snippet: sanitizeText(message.snippet),
            fromEmail: sanitizeText(message.from?.[0]?.email),
            fromName: sanitizeText(message.from?.[0]?.name),
            toEmails: sanitizeParticipants(message.to),
            ccEmails: sanitizeParticipants(message.cc),
            bccEmails: sanitizeParticipants(message.bcc),
            hasAttachments: (message.attachments?.length || 0) > 0,
            attachmentsCount: message.attachments?.length || 0,
            attachments: mappedAttachments,
            isRead: message.unread === false,
            isStarred: message.starred === true,
            folder: sanitizeText(messageFolder), // ✅ Use determined folder
            folders: message.folders || [],
            receivedAt: new Date(message.date * 1000),
            providerData: message as any,
          }).onConflictDoNothing(); // Ignore duplicates silently

          // ✅ FIX: Extract attachments to attachments table
          if (message.attachments && message.attachments.length > 0) {
            // Get the just-inserted email
            const insertedEmail = await db.query.emails.findFirst({
              where: eq(emails.providerMessageId, message.id),
            });

            if (insertedEmail) {
              // Extract attachments asynchronously (don't block sync)
              extractAndSaveAttachments({
                message: message as any,
                emailRecord: insertedEmail as any,
                accountId: account.id,
                userId: account.userId,
                grantId: account.nylasGrantId!,
                nylas,
              }).catch(err => console.error('Attachment extraction error:', err));
            }
          }

          // Process rules for this email (async, don't block sync)
          // Get userId from account
          const userAccount = await db.query.emailAccounts.findFirst({
            where: eq(emailAccounts.id, account.id),
          });

          if (userAccount) {
            // Get the just-inserted email
            const insertedEmail = await db.query.emails.findFirst({
              where: eq(emails.providerMessageId, message.id),
            });

            if (insertedEmail) {
              // Process rules asynchronously (don't await to not block sync)
              RuleEngine.processEmail(insertedEmail as any, userAccount.userId)
                .catch(err => console.error('Rule processing error:', err));
            }
          }
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
        lastError: null, // ✅ Clear any previous errors on success
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
    
    console.log('✅ Email sync completed:', {
      syncedCount,
      hasMore: !!nextCursor,
      nextCursor: nextCursor?.substring(0, 20) + '...',
    });
    
    return NextResponse.json({ 
      success: true, 
      messagesSynced: syncedCount,
      hasMore: !!nextCursor,
      nextCursor,
    });
  } catch (error) {
    console.error('❌ Message sync error:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
    });
    
    // Update account with error
    try {
      await db.update(emailAccounts)
        .set({
          syncStatus: 'error',
          lastError: (error as Error).message,
        })
        .where(eq(emailAccounts.id, accountId));
    } catch (updateError) {
      console.error('Failed to update account error status:', updateError);
    }
    
    return NextResponse.json({ 
      error: 'Sync failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

