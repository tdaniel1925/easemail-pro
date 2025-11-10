/**
 * Nylas Webhook - Calendar Events
 * Handles real-time calendar event updates from Nylas
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calendarEvents, calendarSyncState, emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';

/**
 * Verify Nylas webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-nylas-signature') || '';
    const webhookSecret = process.env.NYLAS_WEBHOOK_SECRET || '';

    // Verify webhook signature
    if (webhookSecret && !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('[Calendar Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    console.log('[Calendar Webhook] Received:', payload.type);

    // Handle different webhook types
    const { type, data } = payload;

    // Handle calendar event notifications
    if (type === 'calendar.event.created' ||
        type === 'calendar.event.updated' ||
        type === 'calendar.event.deleted') {

      await handleCalendarEventWebhook(type, data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Calendar Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCalendarEventWebhook(type: string, data: any) {
  try {
    const { grant_id, object } = data;

    if (!grant_id || !object) {
      console.error('[Calendar Webhook] Missing grant_id or object');
      return;
    }

    // Find the account associated with this grant
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, grant_id),
    });

    if (!account) {
      console.error('[Calendar Webhook] Account not found for grant:', grant_id);
      return;
    }

    const nylas = getNylasClient();

    // Handle event based on type
    switch (type) {
      case 'calendar.event.created':
      case 'calendar.event.updated':
        // Fetch the full event details from Nylas
        try {
          const event = await nylas.events.find({
            identifier: grant_id,
            eventId: object.id,
            queryParams: {
              calendar_id: object.calendar_id,
            },
          });

          // Upsert event to database
          await upsertCalendarEvent(account.userId, event.data);
          console.log('[Calendar Webhook] Event synced:', object.id);
        } catch (error) {
          console.error('[Calendar Webhook] Error fetching event:', error);
        }
        break;

      case 'calendar.event.deleted':
        // Delete event from database
        await db.delete(calendarEvents).where(
          and(
            eq(calendarEvents.userId, account.userId),
            eq(calendarEvents.id, object.id)
          )
        );
        console.log('[Calendar Webhook] Event deleted:', object.id);
        break;
    }

    // Update sync state
    await updateSyncState(account.userId, account.id, object.calendar_id);
  } catch (error) {
    console.error('[Calendar Webhook] Error handling event:', error);
  }
}

async function upsertCalendarEvent(userId: string, event: any) {
  try {
    // Prepare event data for database
    const eventData: any = {
      id: event.id,
      userId: userId,
      title: event.title || 'Untitled Event',
      description: event.description || null,
      location: event.location || null,
      calendarId: event.calendar_id,
      status: event.status || 'confirmed',
      busy: event.busy ?? true,
      metadata: {
        nylasEventId: event.id,
        participants: event.participants || [],
        conferencing: event.conferencing,
        reminders: event.reminders,
      },
    };

    // Handle event timing
    if (event.when) {
      if (event.when.start_time) {
        eventData.startTime = new Date(event.when.start_time * 1000);
      }
      if (event.when.end_time) {
        eventData.endTime = new Date(event.when.end_time * 1000);
      }
      if (event.when.date) {
        // All-day event
        eventData.startTime = new Date(event.when.date);
        eventData.endTime = new Date(event.when.date);
        eventData.isAllDay = true;
      }
    }

    // Check if event exists
    const existingEvent = await db.query.calendarEvents.findFirst({
      where: and(
        eq(calendarEvents.id, event.id),
        eq(calendarEvents.userId, userId)
      ),
    });

    if (existingEvent) {
      // Update existing event
      await db.update(calendarEvents)
        .set({
          ...eventData,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(calendarEvents.id, event.id),
            eq(calendarEvents.userId, userId)
          )
        );
    } else {
      // Insert new event
      await db.insert(calendarEvents).values({
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('[Calendar Webhook] Error upserting event:', error);
    throw error;
  }
}

async function updateSyncState(userId: string, accountId: string, calendarId: string) {
  try {
    const syncState = await db.query.calendarSyncState.findFirst({
      where: and(
        eq(calendarSyncState.userId, userId),
        eq(calendarSyncState.emailAccountId, accountId),
        eq(calendarSyncState.calendarId, calendarId)
      ),
    });

    if (syncState) {
      await db.update(calendarSyncState)
        .set({
          lastSyncAt: new Date(),
          syncStatus: 'idle',
          updatedAt: new Date(),
        })
        .where(eq(calendarSyncState.id, syncState.id));
    } else {
      // Create new sync state
      await db.insert(calendarSyncState).values({
        userId,
        emailAccountId: accountId,
        provider: 'nylas',
        calendarId,
        lastSyncAt: new Date(),
        syncStatus: 'idle',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('[Calendar Webhook] Error updating sync state:', error);
  }
}

// Handle webhook verification (for initial setup)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    // Nylas webhook verification
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  return NextResponse.json({ status: 'ok' });
}
