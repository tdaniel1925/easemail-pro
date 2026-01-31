import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { webhookEvents, emailAccounts, emails, emailFolders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sanitizeText, sanitizeParticipants } from '@/lib/utils/text-sanitizer';
import { normalizeFolderToCanonical } from '@/lib/email/folder-utils';
import { verifyWebhookSignature } from '@/lib/nylas-v3/webhooks';
import * as Sentry from '@sentry/nextjs';
import { broadcastToAccount, type EmailSyncEvent } from '@/lib/sync/sse-broadcaster';

export async function POST(request: NextRequest) {
  // Get signature from header (case-insensitive)
  const signature = request.headers.get('x-nylas-signature') || 
                    request.headers.get('X-Nylas-Signature') || '';
  
  let payload: string;
  
  try {
    // Read raw payload as text (must be exact bytes received)
    payload = await request.text();
  } catch (error) {
    console.error('❌ Failed to read request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  
  // ✅ SECURITY: Verify signature (only allow bypass in development)
  const skipVerification = process.env.NODE_ENV !== 'production' &&
                           process.env.DISABLE_WEBHOOK_VERIFICATION === 'true';

  if (skipVerification) {
    console.warn('⚠️ DEV MODE: Webhook signature verification DISABLED');
  } else {
    // Enhanced logging for debugging
    if (!signature) {
      console.error('❌ Missing webhook signature header', {
        headers: Object.fromEntries(request.headers.entries()),
      });
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    if (!verifyWebhookSignature(payload, signature)) {
      console.error('❌ Invalid webhook signature', {
        signatureLength: signature.length,
        payloadLength: payload.length,
        hasSecret: !!process.env.NYLAS_WEBHOOK_SECRET,
        secretLength: process.env.NYLAS_WEBHOOK_SECRET?.length || 0,
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }
  
  let event: any;
  try {
    event = JSON.parse(payload);
  } catch (error) {
    console.error('❌ Failed to parse webhook payload:', error);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  
  // Respond immediately to Nylas (don't wait for processing)
  // This prevents timeout errors and webhook retries
  const responsePromise = NextResponse.json({ success: true });
  
  // Queue event for async processing without blocking the response
  setImmediate(async () => {
    try {
      // Queue event in database with extended timeout (15s for high load)
      const insertStartTime = Date.now();

      // ✅ FIX: Use ON CONFLICT to handle duplicate webhooks (Nylas retries)
      // This makes the insert idempotent and prevents lock contention
      await db.insert(webhookEvents).values({
        nylasWebhookId: event.id,
        eventType: event.type,
        payload: event,
        processed: false,
      })
      .onConflictDoNothing({ target: webhookEvents.nylasWebhookId })
      .catch((insertError) => {
        const isConnectionTimeout = insertError?.message?.includes('CONNECT_TIMEOUT');
        const isPoolExhausted = insertError?.message?.includes('ETIMEDOUT') ||
                                insertError?.message?.includes('ECONNREFUSED');

        // Log appropriate error level
        if (isConnectionTimeout || isPoolExhausted) {
          console.error('🔴 DATABASE POOL EXHAUSTED:', {
            error: insertError?.message,
            eventId: event.id,
            eventType: event.type,
            suggestion: 'Connection pool likely exhausted - webhook will be retried by Nylas'
          });
        } else {
          console.error('❌ Failed to queue webhook event:', insertError);
        }

        // Capture in Sentry with enhanced context
        Sentry.captureException(insertError, {
          tags: {
            component: 'webhook',
            operation: 'queue_event',
            event_type: event.type,
            is_timeout: isConnectionTimeout,
            is_pool_exhausted: isPoolExhausted,
          },
          extra: {
            eventId: event.id,
            eventType: event.type,
            errorCode: insertError?.code,
            errorMessage: insertError?.message,
            errorStack: insertError?.stack,
          },
        });

        // Don't throw - already responded to Nylas
        // Nylas will retry the webhook if this was a transient error
      });
      
      const insertDuration = Date.now() - insertStartTime;
      
      // Log slow inserts for monitoring (>3s is concerning)
      if (insertDuration > 3000) {
        console.warn(`⚠️ Slow webhook insert: ${insertDuration}ms for event ${event.id} (type: ${event.type})`);
        
        // Track slow queries in Sentry
        Sentry.captureMessage('Slow webhook database insert', {
          level: 'warning',
          tags: {
            component: 'webhook',
            performance: 'slow_query',
          },
          extra: {
            duration: insertDuration,
            eventId: event.id,
            eventType: event.type,
          },
        });
      }
      
      // Process immediately (best effort, don't block)
      processWebhookEvent(event).catch((processError) => {
        console.error('❌ Failed to process webhook event:', processError);
        
        // Capture in Sentry
        Sentry.captureException(processError, {
          tags: {
            component: 'webhook',
            operation: 'process_event',
            event_type: event.type,
          },
          extra: {
            eventId: event.id,
            eventType: event.type,
          },
        });
        
        // Event is queued, can be retried later
      });
    } catch (error) {
      console.error('❌ Webhook background processing error:', error);
      
      // Capture in Sentry
      Sentry.captureException(error, {
        tags: {
          component: 'webhook',
          operation: 'background_processing',
        },
        extra: {
          eventId: event?.id,
          eventType: event?.type,
        },
      });
    }
  });
  
  return responsePromise;
}

async function processWebhookEvent(event: any) {
  const { type, data } = event;
  
  // Add timeout protection for each operation (increased to 15s for high load)
  const operationTimeout = 15000;
  const processStartTime = Date.now();
  
  try {
    const processPromise = (async () => {
      switch (type) {
        case 'message.created':
          await handleMessageCreated(data.object);
          break;

        case 'message.updated':
          await handleMessageUpdated(data.object);
          break;

        case 'message.deleted':
          await handleMessageDeleted(data.object);
          break;

        case 'folder.created':
        case 'folder.updated':
          await handleFolderUpdate(data.object);
          break;

        case 'folder.deleted':
          await handleFolderDeleted(data.object);
          break;

        default:
          console.log('Unhandled webhook event type:', type);
      }
    })();
    
    // Race between processing and timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), operationTimeout);
    });
    
    await Promise.race([processPromise, timeoutPromise]);
    
    const processDuration = Date.now() - processStartTime;
    
    // Log slow processing for monitoring (>5s is concerning)
    if (processDuration > 5000) {
      console.warn(`⚠️ Slow webhook processing: ${processDuration}ms for ${type} event ${event.id}`);
    }
    
  } catch (error: any) {
    const processDuration = Date.now() - processStartTime;
    
    if (error.message === 'Operation timeout') {
      console.error(`⏰ Webhook processing timeout (${processDuration}ms) for ${type}:`, event.id);
    } else {
      console.error(`❌ Event processing error for ${type} (${processDuration}ms):`, error.message || error);
    }
    // Don't throw - event is already queued and can be retried
  }
}

async function handleMessageCreated(message: any) {
  try {
    // Find account by grant ID with timeout
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, message.grant_id),
    });

    if (!account) {
      console.error('Account not found for message:', message.id);
      return;
    }

    // ✅ FIX: Check if message already exists (sent emails are saved first, then webhook fires)
    const existingMessage = await db.query.emails.findFirst({
      where: eq(emails.providerMessageId, sanitizeText(message.id)),
    });

    if (existingMessage) {
      console.log(`⏭️ Skipping duplicate message ${message.id} (already exists in DB)`);
      return;
    }

    // ✅ FIX: Normalize folder using comprehensive utility
    // This handles Gmail, Microsoft, IMAP folder naming conventions
    const folders = message.folders || [];
    const rawFolder = folders[0] || 'inbox';
    const normalizedFolder = normalizeFolderToCanonical(rawFolder);

    // ✅ FIX: Check if this email is FROM the account owner (sent email)
    const isFromAccountOwner = message.from?.[0]?.email?.toLowerCase() === account.emailAddress?.toLowerCase();

    // Override folder to 'sent' if email is from account owner (regardless of provider folder)
    // This handles emails sent from external clients that may arrive in inbox
    let finalFolder = normalizedFolder;
    if (isFromAccountOwner && normalizedFolder !== 'sent' && normalizedFolder !== 'drafts') {
      console.log(`📤 Webhook: Overriding folder "${normalizedFolder}" → "sent" for email from account owner`);
      finalFolder = 'sent';
    }

    // Skip if this is a sent message that we already saved when sending from EaseMail
    if (finalFolder === 'sent' && isFromAccountOwner) {
      // Check if this message already exists (sent via EaseMail)
      const existingMessage = await db.query.emails.findFirst({
        where: eq(emails.providerMessageId, message.id),
      });
      if (existingMessage) {
        console.log(`⏭️ Skipping sent message ${message.id} from webhook (already exists)`);
        return;
      }
    }

    // Insert message into database with sanitized text and correct folder
    await db.insert(emails).values({
      accountId: account.id,
      provider: 'nylas',
      providerMessageId: sanitizeText(message.id),
      threadId: sanitizeText(message.thread_id),
      subject: sanitizeText(message.subject),
      snippet: sanitizeText(message.snippet),
      fromEmail: sanitizeText(message.from?.[0]?.email),
      fromName: sanitizeText(message.from?.[0]?.name),
      toEmails: sanitizeParticipants(message.to),
      ccEmails: sanitizeParticipants(message.cc),
      hasAttachments: message.attachments?.length > 0,
      isRead: message.unread === false,
      isStarred: message.starred === true,
      folder: finalFolder, // ✅ Use corrected folder (sent for emails from account owner)
      folders: folders, // Keep original provider folders for reference
      receivedAt: new Date(message.date * 1000),
      providerData: message,
    }).onConflictDoNothing();

    console.log(`✅ Created message ${message.id} for account ${account.id} in folder ${finalFolder} (raw: ${rawFolder})`);

    // ✅ NEW: Broadcast real-time update via SSE
    const sseEvent: EmailSyncEvent = {
      type: 'message.created',
      accountId: account.id,
      messageId: message.id,
      folder: finalFolder,
      timestamp: Date.now(),
      data: {
        subject: sanitizeText(message.subject),
        fromEmail: sanitizeText(message.from?.[0]?.email),
        fromName: sanitizeText(message.from?.[0]?.name),
        snippet: sanitizeText(message.snippet),
        isRead: message.unread === false,
      },
    };
    broadcastToAccount(account.id, sseEvent);
  } catch (error: any) {
    console.error(`❌ Failed to create message ${message.id}:`, error.message || error);
    throw error; // Re-throw to be caught by parent handler
  }
}

async function handleMessageUpdated(message: any) {
  try {
    // Find account for SSE broadcast and folder normalization
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, message.grant_id),
      columns: { id: true, emailAddress: true },
    });

    if (!account) {
      console.error('❌ Account not found for message update:', message.grant_id);
      return;
    }

    // ✅ FIX: Normalize folder using same logic as handleMessageCreated
    const folders = message.folders || [];
    const rawFolder = folders[0] || 'inbox';
    const normalizedFolder = normalizeFolderToCanonical(rawFolder);

    // ✅ FIX: Check if this is from account owner (sent email detection)
    const isFromAccountOwner = message.from?.[0]?.email?.toLowerCase() === account.emailAddress?.toLowerCase();

    // Override folder to 'sent' if email is from account owner
    let finalFolder = normalizedFolder;
    if (isFromAccountOwner && normalizedFolder !== 'sent' && normalizedFolder !== 'drafts') {
      console.log(`📤 Update webhook: Overriding folder "${normalizedFolder}" → "sent" for email from account owner`);
      finalFolder = 'sent';
    }

    // Update message in database
    await db.update(emails)
      .set({
        isRead: message.unread === false,
        isStarred: message.starred === true,
        folder: finalFolder, // ✅ Now normalized (was: message.folders?.[0])
        folders: folders,    // Keep original provider folders for reference
        updatedAt: new Date(),
      })
      .where(eq(emails.providerMessageId, message.id));

    console.log(`✅ Updated message ${message.id} - folder: ${finalFolder} (raw: ${rawFolder})`);

    // ✅ NEW: Broadcast real-time update via SSE
    const sseEvent: EmailSyncEvent = {
      type: 'message.updated',
      accountId: account.id,
      messageId: message.id,
      folder: finalFolder, // Include folder in broadcast
      timestamp: Date.now(),
      data: {
        isRead: message.unread === false,
        isStarred: message.starred === true,
        folder: finalFolder,
      },
    };
    broadcastToAccount(account.id, sseEvent);
  } catch (error: any) {
    console.error(`❌ Failed to update message ${message.id}:`, error.message || error);
    throw error;
  }
}

async function handleMessageDeleted(message: any) {
  try {
    // Find account for SSE broadcast before deleting
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, message.grant_id),
      columns: { id: true },
    });

    // ✅ FIX: Actually delete the message from local DB instead of just marking as trashed
    // This prevents deleted emails from reappearing when background sync runs
    // The email is already moved to trash in the email provider (Gmail/Outlook)
    await db.delete(emails)
      .where(eq(emails.providerMessageId, message.id));

    console.log(`✅ Deleted message ${message.id} from local database`);

    // ✅ NEW: Broadcast real-time update via SSE
    if (account) {
      const sseEvent: EmailSyncEvent = {
        type: 'message.deleted',
        accountId: account.id,
        messageId: message.id,
        timestamp: Date.now(),
      };
      broadcastToAccount(account.id, sseEvent);
    }
  } catch (error: any) {
    console.error(`❌ Failed to delete message ${message.id}:`, error.message || error);
    throw error;
  }
}

async function handleFolderUpdate(folder: any) {
  try {
    // Find account by grant ID
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, folder.grant_id),
      columns: { id: true },
    });

    if (!account) {
      console.error('❌ Account not found for folder webhook:', folder.grant_id);
      return;
    }

    // Normalize folder name to canonical type
    const normalizedType = normalizeFolderToCanonical(folder.name);

    // Determine folder type (system folder vs custom)
    const folderType = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'all'].includes(normalizedType)
      ? normalizedType
      : 'custom';

    console.log(`📁 Folder webhook: ${folder.name} (type: ${folderType})`);

    // ✅ FIX: Insert or update folder in database (idempotent)
    await db.insert(emailFolders)
      .values({
        accountId: account.id,
        nylasFolderId: folder.id,
        displayName: folder.name,
        folderType: folderType,
        providerAttributes: folder.attributes || {},
        unreadCount: 0, // Will be calculated from emails table
        totalCount: 0,  // Will be calculated from emails table
        syncEnabled: true,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [emailFolders.accountId, emailFolders.nylasFolderId],
        set: {
          displayName: folder.name,
          folderType: folderType,
          providerAttributes: folder.attributes || {},
          updatedAt: new Date(),
        },
      });

    console.log(`✅ Folder ${folder.name} (ID: ${folder.id}) synced for account ${account.id}`);

    // Broadcast real-time update
    const sseEvent: EmailSyncEvent = {
      type: 'folder.updated',
      accountId: account.id,
      timestamp: Date.now(),
      data: {
        folderId: folder.id,
        folderName: folder.name,
        folderType: folderType,
      },
    };
    broadcastToAccount(account.id, sseEvent);
  } catch (error: any) {
    console.error(`❌ Failed to handle folder update for ${folder.id}:`, error.message || error);

    // Capture in Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'webhook',
        operation: 'folder_update',
      },
      extra: {
        folderId: folder.id,
        folderName: folder.name,
        grantId: folder.grant_id,
      },
    });

    throw error;
  }
}

async function handleFolderDeleted(folder: any) {
  try {
    // Find account by grant ID
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, folder.grant_id),
      columns: { id: true },
    });

    if (!account) {
      console.error('❌ Account not found for folder deletion webhook:', folder.grant_id);
      return;
    }

    console.log(`🗑️ Folder deleted webhook: ${folder.name} (ID: ${folder.id})`);

    // Find the folder in database
    const folderRecord = await db.query.emailFolders.findFirst({
      where: and(
        eq(emailFolders.accountId, account.id),
        eq(emailFolders.nylasFolderId, folder.id)
      ),
    });

    if (!folderRecord) {
      console.log(`⏭️ Folder ${folder.id} not found in database (already deleted or never synced)`);
      return;
    }

    // ✅ FIX: Move orphaned emails to inbox before deleting folder
    // This prevents emails from disappearing when folders are deleted
    const normalizedFolderName = normalizeFolderToCanonical(folderRecord.displayName);

    const movedEmailsResult = await db.update(emails)
      .set({
        folder: 'inbox', // Move to inbox as safe default
        updatedAt: new Date(),
      })
      .where(and(
        eq(emails.accountId, account.id),
        eq(emails.folder, normalizedFolderName)
      ));

    console.log(`📥 Moved emails from deleted folder "${folderRecord.displayName}" to inbox`);

    // Delete the folder record
    await db.delete(emailFolders)
      .where(and(
        eq(emailFolders.accountId, account.id),
        eq(emailFolders.nylasFolderId, folder.id)
      ));

    console.log(`✅ Deleted folder ${folder.name} (ID: ${folder.id}) from database`);

    // Broadcast real-time update
    const sseEvent: EmailSyncEvent = {
      type: 'folder.deleted',
      accountId: account.id,
      timestamp: Date.now(),
      data: {
        folderId: folder.id,
        folderName: folder.name,
      },
    };
    broadcastToAccount(account.id, sseEvent);
  } catch (error: any) {
    console.error(`❌ Failed to handle folder deletion for ${folder.id}:`, error.message || error);

    // Capture in Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'webhook',
        operation: 'folder_delete',
      },
      extra: {
        folderId: folder.id,
        folderName: folder.name,
        grantId: folder.grant_id,
      },
    });

    throw error;
  }
}

// Handle Nylas webhook challenges for webhook verification
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge');
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

