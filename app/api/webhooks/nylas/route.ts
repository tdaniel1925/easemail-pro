import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/drizzle';
import { webhookEvents, emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sanitizeText, sanitizeParticipants } from '@/lib/utils/text-sanitizer';

// Verify webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!process.env.NYLAS_WEBHOOK_SECRET) {
    console.warn('NYLAS_WEBHOOK_SECRET not set - skipping signature verification');
    return true; // Allow in development
  }
  
  try {
    const hmac = crypto.createHmac('sha256', process.env.NYLAS_WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-nylas-signature') || '';
  let payload: string;
  
  try {
    payload = await request.text();
  } catch (error) {
    console.error('Failed to read request body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  
  // Verify signature
  if (!verifyWebhookSignature(payload, signature)) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  let event: any;
  try {
    event = JSON.parse(payload);
  } catch (error) {
    console.error('Failed to parse webhook payload:', error);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  
  // Respond immediately to Nylas (don't wait for processing)
  // This prevents timeout errors and webhook retries
  const responsePromise = NextResponse.json({ success: true });
  
  // Queue event for async processing without blocking the response
  setImmediate(async () => {
    try {
      // Queue event in database with timeout protection
      const insertTimeout = setTimeout(() => {
        console.error('⏰ Webhook insert timeout for event:', event.id);
      }, 5000);
      
      await db.insert(webhookEvents).values({
        nylasWebhookId: event.id,
        eventType: event.type,
        payload: event,
        processed: false,
      }).catch((insertError) => {
        console.error('❌ Failed to queue webhook event:', insertError);
        // Don't throw - already responded to Nylas
      });
      
      clearTimeout(insertTimeout);
      
      // Process immediately (best effort, don't block)
      processWebhookEvent(event).catch((processError) => {
        console.error('❌ Failed to process webhook event:', processError);
        // Event is queued, can be retried later
      });
    } catch (error) {
      console.error('❌ Webhook background processing error:', error);
    }
  });
  
  return responsePromise;
}

async function processWebhookEvent(event: any) {
  const { type, data } = event;
  
  // Add timeout protection for each operation
  const operationTimeout = 10000; // 10 seconds max per operation
  
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
    
  } catch (error: any) {
    if (error.message === 'Operation timeout') {
      console.error(`⏰ Webhook processing timeout for ${type}:`, event.id);
    } else {
      console.error(`❌ Event processing error for ${type}:`, error.message || error);
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
    
    // Insert message into database with sanitized text
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
      receivedAt: new Date(message.date * 1000),
      providerData: message,
    }).onConflictDoNothing();
    
    console.log(`✅ Created message ${message.id} for account ${account.id}`);
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
    // Mark as trashed or delete
    await db.update(emails)
      .set({
        isTrashed: true,
        updatedAt: new Date(),
      })
      .where(eq(emails.providerMessageId, message.id));
    
    console.log(`✅ Deleted message ${message.id}`);
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

