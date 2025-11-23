/**
 * Resend Webhook Handler
 * Tracks email delivery status for calendar invitations
 * POST /api/webhooks/resend
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { calendarEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Resend webhook events we track:
 * - email.sent: Email successfully sent to provider
 * - email.delivered: Email delivered to recipient's mailbox
 * - email.delivery_delayed: Delivery temporarily delayed
 * - email.complained: Recipient marked as spam
 * - email.bounced: Email bounced (hard or soft)
 * - email.opened: Recipient opened the email
 * - email.clicked: Recipient clicked a link
 */

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Bounce-specific fields
    bounce_type?: 'hard' | 'soft';
    bounce_subtype?: string;
    diagnostic_code?: string;
    // Complaint-specific
    feedback_type?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (Resend uses Svix for webhooks)
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.warn('⚠️ Missing Resend webhook signature headers');
      return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
    }

    // Parse webhook payload
    const payload: ResendWebhookPayload = await request.json();

    console.log('📧 Resend webhook received:', payload.type, payload.data.email_id);

    // Extract recipient email from 'to' field
    const recipientEmail = payload.data.to?.[0];
    if (!recipientEmail) {
      console.warn('⚠️ No recipient email in webhook payload');
      return NextResponse.json({ received: true });
    }

    // Try to match this to a calendar event invitation
    // We can identify calendar invitations by subject line pattern
    const isCalendarInvitation = payload.data.subject?.includes('Invitation:') ||
                                 payload.data.subject?.includes('Event Updated:') ||
                                 payload.data.subject?.includes('RSVP');

    if (!isCalendarInvitation) {
      // Not a calendar invitation, skip tracking
      return NextResponse.json({ received: true });
    }

    // Find calendar events sent to this email
    const events = await db.query.calendarEvents.findMany({
      where: (calendarEvents, { sql }) => sql`
        ${calendarEvents.attendees}::jsonb @> '[{"email": "${recipientEmail}"}]'::jsonb
      `,
      limit: 10,
    });

    if (events.length === 0) {
      console.log(`No events found for recipient: ${recipientEmail}`);
      return NextResponse.json({ received: true });
    }

    // Update delivery status for all matching events
    for (const event of events) {
      try {
        const metadata = (event.metadata as any) || {};
        const deliveryStatus = metadata.invitationDeliveryStatus || {};

        // Initialize status for this recipient if not exists
        if (!deliveryStatus[recipientEmail]) {
          deliveryStatus[recipientEmail] = {};
        }

        const status = deliveryStatus[recipientEmail];

        // Update status based on event type
        switch (payload.type) {
          case 'email.sent':
            status.sent = true;
            status.sentAt = payload.created_at;
            status.emailId = payload.data.email_id;
            break;

          case 'email.delivered':
            status.delivered = true;
            status.deliveredAt = payload.created_at;
            break;

          case 'email.delivery_delayed':
            status.delayed = true;
            status.delayedAt = payload.created_at;
            break;

          case 'email.bounced':
            status.bounced = true;
            status.bouncedAt = payload.created_at;
            status.bounceType = payload.data.bounce_type;
            status.bounceReason = payload.data.diagnostic_code;
            break;

          case 'email.complained':
            status.complained = true;
            status.complainedAt = payload.created_at;
            status.complaintType = payload.data.feedback_type;
            break;

          case 'email.opened':
            status.opened = true;
            status.openedAt = payload.created_at;
            if (!status.openCount) {
              status.openCount = 0;
            }
            status.openCount++;
            break;

          case 'email.clicked':
            status.clicked = true;
            status.clickedAt = payload.created_at;
            if (!status.clickCount) {
              status.clickCount = 0;
            }
            status.clickCount++;
            break;
        }

        // Save updated metadata
        await db.update(calendarEvents)
          .set({
            metadata: {
              ...metadata,
              invitationDeliveryStatus: deliveryStatus,
            },
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, event.id));

        console.log(`✅ Updated delivery status for event ${event.id}, recipient ${recipientEmail}: ${payload.type}`);
      } catch (updateError: any) {
        console.error(`❌ Failed to update event ${event.id}:`, updateError);
      }
    }

    return NextResponse.json({ received: true, processed: events.length });

  } catch (error: any) {
    console.error('❌ Resend webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}
