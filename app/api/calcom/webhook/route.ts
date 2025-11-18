import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  verifyWebhookSignature,
  parseWebhookEvent,
  CalcomWebhookEvent,
} from '@/lib/calcom/calcom-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/calcom/webhook
 * Receive webhook events from Cal.com
 *
 * This endpoint receives real-time notifications from Cal.com when bookings are created,
 * updated, cancelled, or other events occur.
 *
 * To set up:
 * 1. Go to Cal.com Settings > Developer > Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/calcom/webhook
 * 3. Select events to listen to (BOOKING_CREATED, BOOKING_CANCELLED, etc.)
 * 4. Set webhook secret (store in calcom_connections.webhook_secret)
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    console.log('[Cal.com Webhook] Received event:', body.triggerEvent);

    // Parse webhook event
    const webhookEvent = parseWebhookEvent(body);
    if (!webhookEvent) {
      return NextResponse.json({
        error: 'Invalid webhook payload',
      }, { status: 400 });
    }

    // Get signature from header
    const signature = request.headers.get('x-cal-signature-256') || '';

    // Try to find the user by organizer email or attendee email
    // We need this to verify the webhook and associate it with the right user
    const organizerEmail = webhookEvent.payload.organizer?.email;
    const attendeeEmails = webhookEvent.payload.attendees?.map(a => a.email) || [];
    const allEmails = [organizerEmail, ...attendeeEmails].filter(Boolean) as string[];

    if (allEmails.length === 0) {
      console.error('[Cal.com Webhook] No email addresses found in webhook payload');
      return NextResponse.json({
        error: 'No identifiable email in webhook payload',
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Find user with Cal.com connection matching one of these emails
    // Note: We'll match by organizer email which should be the user's email
    const { data: connection } = await supabase
      .from('calcom_connections')
      .select('*')
      .eq('is_active', true)
      .single();

    let verified = false;
    let userId: string | null = null;
    let connectionId: string | null = null;

    if (connection && connection.webhook_secret) {
      // Verify signature
      verified = await verifyWebhookSignature(
        rawBody,
        signature,
        connection.webhook_secret
      );

      if (verified) {
        userId = connection.user_id;
        connectionId = connection.id;
        console.log('[Cal.com Webhook] Signature verified for user:', userId);
      } else {
        console.warn('[Cal.com Webhook] Signature verification failed');
      }
    }

    // Log webhook event (even if not verified, for debugging)
    const { error: logError } = await supabase
      .from('calcom_webhook_events')
      .insert({
        user_id: userId,
        calcom_connection_id: connectionId,
        trigger_event: webhookEvent.triggerEvent,
        booking_uid: webhookEvent.payload.uid,
        payload: webhookEvent.payload,
        verified,
        processed: false,
      });

    if (logError) {
      console.error('[Cal.com Webhook] Failed to log event:', logError);
    }

    // If not verified, still return 200 to avoid Cal.com retrying
    // But don't process the event
    if (!verified) {
      return NextResponse.json({
        received: true,
        processed: false,
        reason: 'Signature verification failed or no connection found',
      });
    }

    // Process the webhook event
    await processWebhookEvent(webhookEvent, userId!, connectionId!, supabase);

    return NextResponse.json({
      received: true,
      processed: true,
      event: webhookEvent.triggerEvent,
    });

  } catch (error: any) {
    console.error('[Cal.com Webhook] Error:', error);

    // Return 200 even on error to prevent Cal.com from retrying
    // We'll check the webhook_events table for failed events
    return NextResponse.json({
      received: true,
      processed: false,
      error: error.message,
    });
  }
}

/**
 * Process webhook event and update database
 */
async function processWebhookEvent(
  event: CalcomWebhookEvent,
  userId: string,
  connectionId: string,
  supabase: any
) {
  console.log('[Cal.com Webhook] Processing event:', event.triggerEvent);

  const { triggerEvent, payload } = event;

  try {
    switch (triggerEvent) {
      case 'BOOKING_CREATED':
      case 'BOOKING_RESCHEDULED':
      case 'BOOKING_REQUESTED':
        // Create or update booking
        await supabase
          .from('calcom_bookings')
          .upsert({
            user_id: userId,
            calcom_connection_id: connectionId,
            booking_id: payload.id,
            booking_uid: payload.uid,
            event_type_id: payload.type ? parseInt(payload.type) : 0,
            event_type_title: payload.title || 'Unknown Event',
            title: payload.title || 'Unknown',
            description: payload.description,
            start_time: payload.startTime,
            end_time: payload.endTime,
            status: payload.status || 'ACCEPTED',
            organizer_name: payload.organizer?.name,
            organizer_email: payload.organizer?.email,
            organizer_timezone: payload.organizer?.timezone,
            attendees: payload.attendees || [],
            location: payload.location,
            meeting_url: payload.meetingUrl,
            custom_inputs: payload.responses || {},
            metadata: payload.metadata || {},
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,booking_uid',
            ignoreDuplicates: false,
          });

        console.log('[Cal.com Webhook] Booking upserted:', payload.uid);
        break;

      case 'BOOKING_CANCELLED':
      case 'BOOKING_REJECTED':
        // Update booking status
        if (payload.uid) {
          await supabase
            .from('calcom_bookings')
            .update({
              status: triggerEvent === 'BOOKING_CANCELLED' ? 'CANCELLED' : 'REJECTED',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('booking_uid', payload.uid);

          console.log('[Cal.com Webhook] Booking status updated:', payload.uid);
        }
        break;

      case 'MEETING_STARTED':
      case 'MEETING_ENDED':
        // Update booking metadata with meeting start/end info
        if (payload.uid) {
          const metadataUpdate = {
            [`${triggerEvent.toLowerCase()}_at`]: new Date().toISOString(),
          };

          await supabase
            .from('calcom_bookings')
            .update({
              metadata: metadataUpdate,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('booking_uid', payload.uid);

          console.log('[Cal.com Webhook] Meeting status updated:', payload.uid);
        }
        break;

      default:
        console.log('[Cal.com Webhook] Unhandled event type:', triggerEvent);
    }

    // Mark webhook event as processed
    await supabase
      .from('calcom_webhook_events')
      .update({ processed: true })
      .eq('user_id', userId)
      .eq('booking_uid', payload.uid)
      .eq('trigger_event', triggerEvent)
      .eq('processed', false);

  } catch (processError) {
    console.error('[Cal.com Webhook] Processing error:', processError);

    // Update webhook event with error
    await supabase
      .from('calcom_webhook_events')
      .update({
        error_message: (processError as Error).message,
      })
      .eq('user_id', userId)
      .eq('booking_uid', payload.uid)
      .eq('trigger_event', triggerEvent);

    throw processError;
  }
}

/**
 * GET /api/calcom/webhook
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Cal.com Webhook Receiver',
    methods: ['POST'],
    description: 'Receives webhook events from Cal.com',
  });
}
