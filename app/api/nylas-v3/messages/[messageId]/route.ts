/**
 * Nylas v3 - Get Single Message
 * Fetch a single message with full details
 * Supports both Nylas and JMAP/IMAP accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts, emailTrackingEvents, emails } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';
import { createFastmailJMAPClient } from '@/lib/jmap/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const messageId = params.messageId;

    if (!accountId || !messageId) {
      return NextResponse.json(
        { error: 'Account ID and Message ID required' },
        { status: 400 }
      );
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Find account - try both database ID (for JMAP/IMAP) and Nylas grant ID
    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    // If not found by database ID, try Nylas grant ID
    if (!account) {
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.nylasGrantId, accountId),
      });
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    // 3. Handle based on account type
    const isJMAPAccount = account.provider === 'jmap';
    const isIMAPAccount = account.provider === 'imap';

    if (isJMAPAccount) {
      // JMAP Account: Fetch from JMAP API with full body
      console.log('[Message] Fetching JMAP message:', messageId);

      // First, try to find the email in database to get the providerMessageId
      // EmailList passes database ID, but JMAP API needs the JMAP message ID
      let jmapMessageId = messageId;
      let dbEmail = await db.query.emails.findFirst({
        where: and(
          eq(emails.accountId, account.id),
          eq(emails.id, messageId)
        ),
      });

      if (dbEmail) {
        // Found by database ID - use providerMessageId for JMAP API
        jmapMessageId = dbEmail.providerMessageId || messageId;
        console.log('[Message] Resolved JMAP message ID from database:', jmapMessageId);
      } else {
        // Try looking up by providerMessageId
        dbEmail = await db.query.emails.findFirst({
          where: and(
            eq(emails.accountId, account.id),
            eq(emails.providerMessageId, messageId)
          ),
        });
        console.log('[Message] Using messageId as JMAP ID:', jmapMessageId);
      }

      const apiToken = Buffer.from(account.imapPassword || '', 'base64').toString('utf-8');
      const jmapClient = createFastmailJMAPClient(apiToken);
      await jmapClient.connect();

      // Fetch full email with body using the JMAP message ID
      const jmapEmail = await jmapClient.getEmailBody(jmapMessageId);

      if (!jmapEmail) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      // Extract body content from bodyValues
      let bodyHtml = '';
      let bodyText = '';

      // JMAP returns htmlBody and textBody as arrays of part references
      // The actual content is in bodyValues
      if (jmapEmail.bodyValues) {
        // Get HTML body if available
        const htmlBody = (jmapEmail as any).htmlBody;
        if (htmlBody && htmlBody.length > 0) {
          const htmlPartId = htmlBody[0].partId;
          if (jmapEmail.bodyValues[htmlPartId]) {
            bodyHtml = jmapEmail.bodyValues[htmlPartId].value;
          }
        }

        // Get text body as fallback
        const textBody = (jmapEmail as any).textBody;
        if (textBody && textBody.length > 0) {
          const textPartId = textBody[0].partId;
          if (jmapEmail.bodyValues[textPartId]) {
            bodyText = jmapEmail.bodyValues[textPartId].value;
          }
        }
      }

      // Format attachments from JMAP format
      const attachments = ((jmapEmail as any).attachments || []).map((att: any) => ({
        id: att.blobId,
        filename: att.name || 'attachment',
        size: att.size || 0,
        content_type: att.type || 'application/octet-stream',
        blobId: att.blobId, // Keep blobId for JMAP download
      }));

      console.log('[Message] JMAP body extracted:', {
        hasHtml: !!bodyHtml,
        htmlLength: bodyHtml.length,
        hasText: !!bodyText,
        textLength: bodyText.length,
        attachmentCount: attachments.length,
      });

      // Format response to match Nylas format AND EmailList component expectations
      const formattedMessage = {
        id: jmapEmail.id,
        subject: jmapEmail.subject || '(No Subject)',
        from: jmapEmail.from || [],
        to: jmapEmail.to || [],
        cc: jmapEmail.cc || [],
        bcc: jmapEmail.bcc || [],
        date: Math.floor(new Date(jmapEmail.receivedAt).getTime() / 1000),
        body: bodyHtml || bodyText || jmapEmail.preview || '',
        bodyHtml: bodyHtml || '', // For EmailList component
        bodyText: bodyText || '', // For EmailList component
        snippet: jmapEmail.preview || '',
        unread: !jmapEmail.keywords?.['$seen'],
        starred: !!jmapEmail.keywords?.['$flagged'],
        attachments: attachments,
      };

      return NextResponse.json({
        success: true,
        message: formattedMessage,
      });
    } else if (isIMAPAccount) {
      // IMAP Account: Fetch from local database
      console.log('[Message] Fetching IMAP message from database:', messageId);

      // Try to find by database ID first (EmailList uses database ID), then by providerMessageId
      let email = await db.query.emails.findFirst({
        where: and(
          eq(emails.accountId, account.id),
          eq(emails.id, messageId)
        ),
      });

      if (!email) {
        // Fallback to providerMessageId
        email = await db.query.emails.findFirst({
          where: and(
            eq(emails.accountId, account.id),
            eq(emails.providerMessageId, messageId)
          ),
        });
      }

      if (!email) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      // Format response to match Nylas format AND EmailList component expectations
      const formattedMessage = {
        id: email.providerMessageId,
        subject: email.subject || '(No Subject)',
        from: [{ email: email.fromEmail || '', name: email.fromName || '' }],
        to: email.toEmails || [],
        cc: email.ccEmails || [],
        bcc: email.bccEmails || [],
        date: Math.floor((email.receivedAt?.getTime() || Date.now()) / 1000),
        body: email.bodyHtml || email.bodyText || '',
        bodyHtml: email.bodyHtml || '', // For EmailList component
        bodyText: email.bodyText || '', // For EmailList component
        snippet: email.snippet || '',
        unread: !email.isRead,
        starred: email.isStarred || false,
        attachments: email.attachments || [],
      };

      return NextResponse.json({
        success: true,
        message: formattedMessage,
      });
    } else {
      // Nylas Account: Use Nylas API
      if (!account.nylasGrantId) {
        return NextResponse.json(
          { error: 'Account not connected to Nylas' },
          { status: 400 }
        );
      }

      const nylas = getNylasClient();

      const message = await nylas.messages.find({
        identifier: account.nylasGrantId,
        messageId: messageId,
      });

      console.log('[Message] Fetched Nylas message:', messageId);

      // Check if this message has tracking data
      let trackingId: string | undefined;
      try {
        const trackingEvent = await db.query.emailTrackingEvents.findFirst({
          where: eq(emailTrackingEvents.emailId, messageId),
        });

        if (trackingEvent) {
          trackingId = trackingEvent.trackingId;
          console.log('[Message] Found tracking for message:', trackingId);
        }
      } catch (trackingError) {
        console.error('[Message] Error fetching tracking data:', trackingError);
      }

      return NextResponse.json({
        success: true,
        message: message.data,
        trackingId: trackingId || undefined,
      });
    }
  } catch (error) {
    console.error('[Message] Error fetching message:', error);

    // Try to handle as Nylas error, otherwise return generic error
    try {
      const nylasError = handleNylasError(error);
      return NextResponse.json(
        {
          success: false,
          error: nylasError.message,
          code: nylasError.code,
        },
        { status: nylasError.statusCode || 500 }
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch message',
        },
        { status: 500 }
      );
    }
  }
}

// PUT - Update message (mark as read, starred, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const body = await request.json();
    const { accountId, unread, starred, folders } = body;
    const messageId = params.messageId;

    if (!accountId || !messageId) {
      return NextResponse.json(
        { error: 'Account ID and Message ID required' },
        { status: 400 }
      );
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Find account - try both database ID and Nylas grant ID
    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.nylasGrantId, accountId),
      });
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    // 3. Handle based on account type
    const isJMAPAccount = account.provider === 'jmap';
    const isIMAPAccount = account.provider === 'imap';

    if (isJMAPAccount || isIMAPAccount) {
      // For JMAP/IMAP: Update local database record
      console.log('[Message] Updating JMAP/IMAP message in database:', messageId);

      const updateData: any = {};
      if (unread !== undefined) {
        updateData.isRead = !unread;
      }
      if (starred !== undefined) {
        updateData.isStarred = starred;
      }

      await db.update(emails)
        .set(updateData)
        .where(and(
          eq(emails.accountId, account.id),
          eq(emails.providerMessageId, messageId)
        ));

      // TODO: For JMAP, also update the server-side status

      return NextResponse.json({
        success: true,
        message: { id: messageId, ...updateData },
      });
    } else {
      // Nylas Account
      if (!account.nylasGrantId) {
        return NextResponse.json(
          { error: 'Account not connected to Nylas' },
          { status: 400 }
        );
      }

      const nylas = getNylasClient();

      const updateData: any = {};

      if (unread !== undefined) {
        updateData.unread = unread;
      }

      if (starred !== undefined) {
        updateData.starred = starred;
      }

      if (folders) {
        updateData.folders = folders;
      }

      const response = await nylas.messages.update({
        identifier: account.nylasGrantId,
        messageId: messageId,
        requestBody: updateData,
      });

      console.log('[Message] Updated Nylas message:', messageId);

      return NextResponse.json({
        success: true,
        message: response.data,
      });
    }
  } catch (error) {
    console.error('[Message] Error updating message:', error);

    try {
      const nylasError = handleNylasError(error);
      return NextResponse.json(
        {
          success: false,
          error: nylasError.message,
          code: nylasError.code,
        },
        { status: nylasError.statusCode || 500 }
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update message',
        },
        { status: 500 }
      );
    }
  }
}

// DELETE - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const messageId = params.messageId;

    if (!accountId || !messageId) {
      return NextResponse.json(
        { error: 'Account ID and Message ID required' },
        { status: 400 }
      );
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Find account - try both database ID and Nylas grant ID
    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account) {
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.nylasGrantId, accountId),
      });
    }

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    // 3. Handle based on account type
    const isJMAPAccount = account.provider === 'jmap';
    const isIMAPAccount = account.provider === 'imap';

    if (isJMAPAccount || isIMAPAccount) {
      // For JMAP/IMAP: Delete from local database
      console.log('[Message] Deleting JMAP/IMAP message from database:', messageId);

      await db.delete(emails)
        .where(and(
          eq(emails.accountId, account.id),
          eq(emails.providerMessageId, messageId)
        ));

      // TODO: For JMAP, also delete on the server

      return NextResponse.json({
        success: true,
      });
    } else {
      // Nylas Account
      if (!account.nylasGrantId) {
        return NextResponse.json(
          { error: 'Account not connected to Nylas' },
          { status: 400 }
        );
      }

      const nylas = getNylasClient();

      await nylas.messages.destroy({
        identifier: account.nylasGrantId,
        messageId: messageId,
      });

      console.log('[Message] Deleted Nylas message:', messageId);

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error) {
    console.error('[Message] Error deleting message:', error);

    try {
      const nylasError = handleNylasError(error);
      return NextResponse.json(
        {
          success: false,
          error: nylasError.message,
          code: nylasError.code,
        },
        { status: nylasError.statusCode || 500 }
      );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete message',
        },
        { status: 500 }
      );
    }
  }
}
