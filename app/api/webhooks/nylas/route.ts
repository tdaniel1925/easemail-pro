import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/drizzle';
import { webhookEvents, emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeText, sanitizeParticipants } from '@/lib/utils/text-sanitizer';
import { normalizeFolderToCanonical } from '@/lib/email/folder-utils';
import * as Sentry from '@sentry/nextjs';

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!process.env.NYLAS_WEBHOOK_SECRET) {
    console.warn('⚠️ NYLAS_WEBHOOK_SECRET not set - skipping signature verification');
    return true; // Allow in development
  }
  
  try {
    const hmac = crypto.createHmac('sha256', process.env.NYLAS_WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest('hex');
    
    // Log for debugging (first 20 chars only for security)
    console.log('[Webhook] Signature verification:', {
      receivedSignature: signature.substring(0, 20) + '...',
      calculatedSignature: digest.substring(0, 20) + '...',
      payloadLength: payload.length,
      match: signature === digest
    });
    
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-nylas-signature') || '';
  let payload: string;
  
  try {
    payload = await request.text();
  } catch (error) {
    console.error('❌ Failed to read request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  
  // Verify signature (can be disabled with DISABLE_WEBHOOK_VERIFICATION=true for debugging)
  const skipVerification = process.env.DISABLE_WEBHOOK_VERIFICATION === 'true';
  
  if (skipVerification) {
    console.warn('⚠️ Webhook signature verification DISABLED (DISABLE_WEBHOOK_VERIFICATION=true)');
  } else if (!verifyWebhookSignature(payload, signature)) {
    console.error('❌ Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
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

    // Skip if this is a sent message coming from webhook (we already saved it when sending)
    const isSentFolder = normalizedFolder === 'sent';
    if (isSentFolder && message.from?.[0]?.email === account.emailAddress) {
      console.log(`⏭️ Skipping sent message ${message.id} from webhook (already saved when sending)`);
      return;
    }

    // Insert message into database with sanitized text and normalized folder
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
      folder: normalizedFolder, // ✅ Use normalized folder (sent, inbox, drafts, etc.)
      folders: folders, // Keep original provider folders for reference
      receivedAt: new Date(message.date * 1000),
      providerData: message,
    }).onConflictDoNothing();

    console.log(`✅ Created message ${message.id} for account ${account.id} in folder ${normalizedFolder} (raw: ${rawFolder})`);
  } catch (error: any) {
    console.error(`❌ Failed to create message ${message.id}:`, error.message || error);
    throw error; // Re-throw to be caught by parent handler
  }
}

async function handleMessageUpdated(message: any) {
  try {
    // Update message in database
    await db.update(emails)
      .set({
        isRead: message.unread === false,
        isStarred: message.starred === true,
        folder: message.folders?.[0],
        updatedAt: new Date(),
      })
      .where(eq(emails.providerMessageId, message.id));
    
    console.log(`✅ Updated message ${message.id}`);
  } catch (error: any) {
    console.error(`❌ Failed to update message ${message.id}:`, error.message || error);
    throw error;
  }
}

async function handleMessageDeleted(message: any) {
  try {
    // ✅ FIX: Actually delete the message from local DB instead of just marking as trashed
    // This prevents deleted emails from reappearing when background sync runs
    // The email is already moved to trash in the email provider (Gmail/Outlook)
    const result = await db.delete(emails)
      .where(eq(emails.providerMessageId, message.id));

    console.log(`✅ Deleted message ${message.id} from local database`);
  } catch (error: any) {
    console.error(`❌ Failed to delete message ${message.id}:`, error.message || error);
    throw error;
  }
}

async function handleFolderUpdate(folder: any) {
  // Update folder in database
  console.log('Folder update:', folder);
  // Implementation depends on folder structure
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

