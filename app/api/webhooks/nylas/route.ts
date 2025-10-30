import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db/drizzle';
import { webhookEvents, emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
  const payload = await request.text();
  
  // Verify signature
  if (!verifyWebhookSignature(payload, signature)) {
    console.error('Invalid webhook signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  try {
    const event = JSON.parse(payload);
    
    // Queue event for processing
    await db.insert(webhookEvents).values({
      nylasWebhookId: event.id,
      eventType: event.type,
      payload: event,
      processed: false,
    });
    
    // Process immediately (async - don't wait)
    processWebhookEvent(event).catch(console.error);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function processWebhookEvent(event: any) {
  const { type, data } = event;
  
  try {
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
  } catch (error) {
    console.error('Event processing error:', error);
  }
}

async function handleMessageCreated(message: any) {
  // Find account by grant ID
  const account = await db.query.emailAccounts.findFirst({
    where: eq(emailAccounts.nylasGrantId, message.grant_id),
  });
  
  if (!account) {
    console.error('Account not found for message:', message.id);
    return;
  }
  
  // Insert message into database
  await db.insert(emails).values({
    accountId: account.id,
    provider: 'nylas',
    providerMessageId: message.id,
    threadId: message.thread_id,
    subject: message.subject,
    snippet: message.snippet,
    fromEmail: message.from?.[0]?.email,
    fromName: message.from?.[0]?.name,
    toEmails: message.to || [],
    ccEmails: message.cc || [],
    hasAttachments: message.attachments?.length > 0,
    isRead: message.unread === false,
    isStarred: message.starred === true,
    receivedAt: new Date(message.date * 1000),
    providerData: message,
  }).onConflictDoNothing();
}

async function handleMessageUpdated(message: any) {
  // Update message in database
  await db.update(emails)
    .set({
      isRead: message.unread === false,
      isStarred: message.starred === true,
      folder: message.folders?.[0],
      updatedAt: new Date(),
    })
    .where(eq(emails.providerMessageId, message.id));
}

async function handleMessageDeleted(message: any) {
  // Mark as trashed or delete
  await db.update(emails)
    .set({
      isTrashed: true,
      updatedAt: new Date(),
    })
    .where(eq(emails.providerMessageId, message.id));
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

