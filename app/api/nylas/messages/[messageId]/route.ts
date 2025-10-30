import { NextRequest, NextResponse } from 'next/server';
import { nylas } from '@/lib/email/nylas-client';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET: Fetch full message details
export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const messageId = params.messageId;
  
  try {
    // Get message from database
    const message = await db.query.emails.findFirst({
      where: eq(emails.providerMessageId, messageId),
      with: {
        account: true,
      },
    });
    
    if (!message || !message.account?.nylasGrantId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    
    // Fetch full message body from Nylas if not cached
    if (!message.bodyHtml && !message.bodyText) {
      const nylasMessage = await nylas.messages.find({
        identifier: message.account.nylasGrantId,
        messageId: message.providerMessageId,
      });
      
      // Update database with body
      await db.update(emails)
        .set({
          bodyHtml: nylasMessage.data.body || '',
          bodyText: (nylasMessage.data as any).bodyPlain || '',
          updatedAt: new Date(),
        })
        .where(eq(emails.id, message.id));
      
      return NextResponse.json({ 
        success: true, 
        message: {
          ...message,
          bodyHtml: nylasMessage.data.body,
          bodyText: (nylasMessage.data as any).bodyPlain,
        }
      });
    }
    
    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Message fetch error:', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

// PUT: Update message (mark read, star, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const messageId = params.messageId;
  const updates = await request.json();
  
  try {
    // Get message
    const message = await db.query.emails.findFirst({
      where: eq(emails.providerMessageId, messageId),
      with: { account: true },
    });
    
    if (!message || !message.account?.nylasGrantId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    
    // Update in Nylas first
    await nylas.messages.update({
      identifier: message.account.nylasGrantId,
      messageId: message.providerMessageId,
      requestBody: {
        unread: updates.isRead === false,
        starred: updates.isStarred === true,
        folders: updates.folders,
      },
    });
    
    // Update in database
    await db.update(emails)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(emails.id, message.id));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message update error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

// DELETE: Delete/trash message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const messageId = params.messageId;
  const permanent = request.nextUrl.searchParams.get('permanent') === 'true';
  
  try {
    // Get message
    const message = await db.query.emails.findFirst({
      where: eq(emails.providerMessageId, messageId),
      with: { account: true },
    });
    
    if (!message || !message.account?.nylasGrantId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }
    
    if (permanent) {
      // Permanently delete from Nylas
      await nylas.messages.destroy({
        identifier: message.account.nylasGrantId,
        messageId: message.providerMessageId,
      });
      
      // Delete from database
      await db.delete(emails).where(eq(emails.id, message.id));
    } else {
      // Move to trash
      await db.update(emails)
        .set({
          isTrashed: true,
          updatedAt: new Date(),
        })
        .where(eq(emails.id, message.id));
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message delete error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

