/**
 * Nylas v3 - Send Message
 * Send emails using Nylas v3 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, to, cc, bcc, subject, body: emailBody, attachments, replyToMessageId } = body;

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to account' }, { status: 403 });
    }

    if (!account.nylasGrantId) {
      return NextResponse.json({ error: 'Account not connected to Nylas' }, { status: 400 });
    }

    // 3. Prepare message data for Nylas v3
    const nylas = getNylasClient();

    const messageData: any = {
      subject: subject || '(No Subject)',
      body: emailBody || '',
    };

    // Format recipients for Nylas v3
    if (to && Array.isArray(to)) {
      messageData.to = to.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (to && typeof to === 'string') {
      messageData.to = to.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    if (cc && Array.isArray(cc)) {
      messageData.cc = cc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (cc && typeof cc === 'string') {
      messageData.cc = cc.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    if (bcc && Array.isArray(bcc)) {
      messageData.bcc = bcc.map((recipient: any) => ({
        email: recipient.email,
        name: recipient.name || undefined,
      }));
    } else if (bcc && typeof bcc === 'string') {
      messageData.bcc = bcc.split(',').map((email: string) => ({
        email: email.trim(),
      }));
    }

    // Add reply-to header if this is a reply
    if (replyToMessageId) {
      messageData.reply_to_message_id = replyToMessageId;
    }

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      messageData.attachments = attachments.map((att: any) => ({
        filename: att.filename,
        content_type: att.contentType,
        size: att.size,
        // Nylas v3 expects file data or URL
        // You'll need to implement attachment upload to Nylas separately
      }));
    }

    console.log('[Send] Sending message via Nylas v3:', {
      grantId: account.nylasGrantId,
      to: messageData.to,
      subject: messageData.subject,
    });

    // 4. Send message via Nylas v3
    const response = await nylas.messages.send({
      identifier: account.nylasGrantId,
      requestBody: messageData,
    });

    console.log('[Send] Message sent successfully:', response.data.id);

    return NextResponse.json({
      success: true,
      messageId: response.data.id,
      data: response.data,
    });
  } catch (error) {
    console.error('[Send] Error sending message:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json({
      success: false,
      error: nylasError.message,
      code: nylasError.code,
    }, { status: nylasError.statusCode || 500 });
  }
}
