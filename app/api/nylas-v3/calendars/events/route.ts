/**
 * Nylas v3 - Calendar Events
 * List and create calendar events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const calendarId = searchParams.get('calendarId');
    const calendarIds = searchParams.get('calendarIds'); // Comma-separated list
    const start = searchParams.get('start'); // Unix timestamp
    const end = searchParams.get('end'); // Unix timestamp

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    // accountId is actually the nylasGrantId, not the database id
    console.log('[Calendar Events] Looking up account with nylasGrantId:', accountId);
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      console.error('[Calendar Events] Account not found for nylasGrantId:', accountId);
      return NextResponse.json({ error: 'Account not found', accountId }, { status: 404 });
    }

    console.log('[Calendar Events] Found account:', account.id, 'userId:', account.userId, 'requestUserId:', user.id);

    if (account.userId !== user.id) {
      console.error('[Calendar Events] User ID mismatch. Account userId:', account.userId, 'Request userId:', user.id);
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    if (!account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Determine which calendars to fetch
    const calendarsToFetch: string[] = [];

    if (calendarIds) {
      // Multiple calendar IDs provided
      calendarsToFetch.push(...calendarIds.split(',').filter(id => id.trim()));
    } else if (calendarId) {
      // Single calendar ID provided
      calendarsToFetch.push(calendarId);
    }

    // 4. Fetch events from Nylas v3
    const nylas = getNylasClient();
    let allEvents: any[] = [];

    if (calendarsToFetch.length > 0) {
      // Fetch events for each selected calendar
      const eventPromises = calendarsToFetch.map(async (calId) => {
        const queryParams: any = {
          calendar_id: calId,
        };

        if (start) {
          queryParams.start = parseInt(start);
        }

        if (end) {
          queryParams.end = parseInt(end);
        }

        try {
          const events = await nylas.events.list({
            identifier: account.nylasGrantId!,
            queryParams,
          });
          return events.data;
        } catch (err) {
          console.error(`[Calendar Events] Error fetching events for calendar ${calId}:`, err);
          return [];
        }
      });

      const eventArrays = await Promise.all(eventPromises);
      allEvents = eventArrays.flat();
    } else {
      // No specific calendars selected, fetch calendars first then get events for all
      try {
        const calendarsResponse = await nylas.calendars.list({
          identifier: account.nylasGrantId,
        });

        const calendarIds = calendarsResponse.data
          .filter((cal: any) => !cal.readOnly) // Only fetch writable calendars
          .map((cal: any) => cal.id);

        console.log('[Calendar Events] No calendars selected, fetching from all calendars:', calendarIds.length);

        // Fetch events for each calendar
        const eventPromises = calendarIds.map(async (calId: string) => {
          const queryParams: any = {
            calendar_id: calId,
          };

          if (start) {
            queryParams.start = parseInt(start);
          }

          if (end) {
            queryParams.end = parseInt(end);
          }

          try {
            const events = await nylas.events.list({
              identifier: account.nylasGrantId!,
              queryParams,
            });
            return events.data;
          } catch (err) {
            console.error(`[Calendar Events] Error fetching events for calendar ${calId}:`, err);
            return [];
          }
        });

        const eventArrays = await Promise.all(eventPromises);
        allEvents = eventArrays.flat();
      } catch (err) {
        console.error('[Calendar Events] Error fetching calendars:', err);
        allEvents = [];
      }
    }

    console.log('[Calendar Events] Fetched events:', allEvents.length);

    // Log events with missing time data for debugging
    const eventsWithoutTime = allEvents.filter((event: any) => {
      return !event.when?.startTime && !event.when?.date && !event.startTime && !event.start_time;
    });

    if (eventsWithoutTime.length > 0) {
      console.warn('[Calendar Events] Found events without valid time data:', eventsWithoutTime.length);
      eventsWithoutTime.slice(0, 3).forEach((event: any) => {
        console.warn('[Calendar Events] Event missing time:', {
          id: event.id,
          title: event.title,
          when: event.when,
          hasStartTime: !!event.startTime,
          hasStart_time: !!event.start_time,
        });
      });
    }

    // Filter out events without valid time data at the API level
    const validEvents = allEvents.filter((event: any) => {
      const hasValidTime = !!(
        event.when?.startTime ||
        event.when?.date ||
        event.startTime ||
        event.start_time
      );
      return hasValidTime;
    });

    if (validEvents.length < allEvents.length) {
      console.warn(`[Calendar Events] Filtered out ${allEvents.length - validEvents.length} events without valid time data`);
    }

    return NextResponse.json({
      success: true,
      events: validEvents,
    });
  } catch (error) {
    console.error('[Calendar Events] Error fetching events:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json(
      {
        success: false,
        error: nylasError.message,
        code: nylasError.code,
      },
      { status: nylasError.statusCode || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      calendarId,
      title,
      description,
      when,
      participants,
      location,
      conferencing,
      busy,
      reminders,
    } = body;

    if (!accountId || !calendarId) {
      return NextResponse.json(
        { error: 'Account ID and Calendar ID required' },
        { status: 400 }
      );
    }

    // 1. Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify account ownership
    // accountId is actually the nylasGrantId, not the database id
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    if (!account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Prepare event data
    const eventData: any = {
      title: title || 'Untitled Event',
      calendar_id: calendarId,
    };

    if (description) {
      eventData.description = description;
    }

    if (when) {
      eventData.when = when;
    }

    if (participants && Array.isArray(participants)) {
      eventData.participants = participants.map((p: any) => ({
        email: p.email,
        name: p.name || undefined,
        status: p.status || 'noreply',
      }));
    }

    if (location) {
      eventData.location = location;
    }

    if (conferencing) {
      eventData.conferencing = conferencing;
    }

    if (busy !== undefined) {
      eventData.busy = busy;
    }

    if (reminders) {
      eventData.reminders = reminders;
    }

    // 4. Create event via Nylas v3
    const nylas = getNylasClient();

    const response = await nylas.events.create({
      identifier: account.nylasGrantId,
      requestBody: eventData,
      queryParams: {
        calendarId: calendarId,
      },
    });

    console.log('[Calendar Events] Created event:', response.data.id);

    return NextResponse.json({
      success: true,
      event: response.data,
    });
  } catch (error) {
    console.error('[Calendar Events] Error creating event:', error);
    const nylasError = handleNylasError(error);

    return NextResponse.json(
      {
        success: false,
        error: nylasError.message,
        code: nylasError.code,
      },
      { status: nylasError.statusCode || 500 }
    );
  }
}
