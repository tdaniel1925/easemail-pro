/**
 * Nylas v3 - Send Message
 * Send emails using Nylas v3 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts, emailDrafts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';
import { processEmailForTracking } from '@/lib/email-tracking';
import { trackEmailUsage } from '@/lib/billing/track-usage';
import { users } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, to, cc, bcc, subject, body: emailBody, attachments, replyToMessageId, trackOpens = true, trackClicks = true, draftId } = body;

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    // Note: accountId is the Nylas grant ID, not the database ID
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
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

    // 4. Add tracking if enabled and body is HTML
    let trackingId: string | undefined;
    if ((trackOpens || trackClicks) && emailBody && emailBody.includes('<')) {
      // Get first recipient for tracking (for multi-recipient, each gets unique tracking)
      const firstRecipient = messageData.to?.[0];

      if (firstRecipient) {
        try {
          const trackingResult = await processEmailForTracking({
            userId: user.id,
            recipientEmail: firstRecipient.email,
            subject: messageData.subject,
            htmlBody: emailBody,
            draftId: draftId || undefined,
            trackingOptions: {
              trackOpens,
              trackClicks,
            },
          });

          messageData.body = trackingResult.htmlWithTracking;
          trackingId = trackingResult.trackingId;

          console.log('[Send] Added tracking:', trackingId);
        } catch (trackingError) {
          console.error('[Send] Tracking failed, sending without tracking:', trackingError);
          // Continue sending without tracking if it fails
        }
      }
    }

    console.log('[Send] Sending message via Nylas v3:', {
      grantId: account.nylasGrantId,
      to: messageData.to,
      subject: messageData.subject,
      tracked: !!trackingId,
    });

    // 5. Send message via Nylas v3
    const response = await nylas.messages.send({
      identifier: account.nylasGrantId,
      requestBody: messageData,
    });

    console.log('[Send] Message sent successfully:', response.data.id);

    // 6. Update tracking event with message ID if tracking was added
    if (trackingId) {
      try {
        const { emailTrackingEvents } = await import('@/lib/db/schema');
        const { eq } = await import('drizzle-orm');

        await db.update(emailTrackingEvents)
          .set({ emailId: response.data.id })
          .where(eq(emailTrackingEvents.trackingId, trackingId));

        console.log('[Send] Updated tracking event with message ID:', response.data.id);
      } catch (updateError) {
        console.error('[Send] Failed to update tracking with message ID:', updateError);
        // Non-critical error, continue
      }
    }

    // 7. Delete local draft if this was sent from a draft
    if (draftId) {
      try {
        console.log('[Send] Deleting local draft after successful send:', draftId);

        await db
          .delete(emailDrafts)
          .where(
            and(
              eq(emailDrafts.id, draftId),
              eq(emailDrafts.userId, user.id)
            )
          );

        console.log('[Send] ✅ Local draft deleted successfully');
      } catch (deleteError) {
        console.error('[Send] Failed to delete draft (non-critical):', deleteError);
        // Non-critical error, email was sent successfully
      }
    }

    // 8. Track email usage for billing
    try {
      const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
      const recipientCount = (messageData.to?.length || 0) + (messageData.cc?.length || 0) + (messageData.bcc?.length || 0);

      await trackEmailUsage(
        user.id,
        dbUser?.organizationId || undefined,
        recipientCount || 1,
        {
          messageId: response.data.id,
          accountId: account.id,
          subject: messageData.subject,
          hasAttachments: !!attachments?.length,
          tracked: !!trackingId,
        }
      );
    } catch (billingError) {
      console.warn('⚠️ Failed to track email for billing:', billingError);
    }

    return NextResponse.json({
      success: true,
      messageId: response.data.id,
      trackingId: trackingId || undefined,
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
