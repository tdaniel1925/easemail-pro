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

// ✅ In-memory cache to prevent excessive API calls
const eventsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5000; // 5 second cache (prevents rapid duplicate requests)

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

    // ✅ Check cache first
    const cacheKey = `${accountId}-${start}-${end}-${calendarIds || calendarId || 'all'}`;
    const cached = eventsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
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

    // 3. Fetch calendars first to get color mapping
    const nylas = getNylasClient();
    const calendarsResponse = await nylas.calendars.list({
      identifier: account.nylasGrantId,
    });

    // Create calendar color mapping (calendar ID -> color info)
    const calendarColorMap = new Map<string, { hexColor: string; name: string; isPrimary: boolean }>();
    calendarsResponse.data.forEach((cal: any) => {
      calendarColorMap.set(cal.id, {
        hexColor: cal.hexColor || '#3b82f6', // Default blue
        name: cal.name,
        isPrimary: cal.isPrimary || false,
      });
    });

    console.log('[Calendar Events] Loaded calendar color mapping for', calendarColorMap.size, 'calendars');

    // 4. Determine which calendars to fetch
    const calendarsToFetch: string[] = [];

    if (calendarIds) {
      // Multiple calendar IDs provided
      calendarsToFetch.push(...calendarIds.split(',').filter(id => id.trim()));
    } else if (calendarId) {
      // Single calendar ID provided
      calendarsToFetch.push(calendarId);
    }

    // 5. Fetch events from Nylas v3
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
          // Include ALL calendars (read-only team calendars, shared calendars, etc.)
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
      try {
        // Check if event has time data
        const hasValidTime = !!(
          event.when?.startTime ||
          event.when?.date ||
          event.startTime ||
          event.start_time
        );

        if (!hasValidTime) {
          return false;
        }

        // Validate that the date can actually be parsed and is valid
        let testDate: Date | null = null;

        if (event.when?.startTime) {
          testDate = new Date(event.when.startTime * 1000);
        } else if (event.when?.date) {
          testDate = new Date(event.when.date);
        } else if (event.startTime) {
          testDate = new Date(event.startTime);
        } else if (event.start_time) {
          testDate = new Date(event.start_time);
        }

        // Check if date is valid and within reasonable range
        if (!testDate || isNaN(testDate.getTime())) {
          console.warn('[Calendar Events] Invalid date for event:', event.id, event.title);
          return false;
        }

        // Check if date is within reasonable range (year 1900 to 2100)
        const year = testDate.getFullYear();
        if (year < 1900 || year > 2100) {
          console.warn('[Calendar Events] Date out of range for event:', event.id, event.title, year);
          return false;
        }

        return true;
      } catch (err) {
        console.warn('[Calendar Events] Error validating event:', event.id, err);
        return false;
      }
    });

    if (validEvents.length < allEvents.length) {
      console.warn(`[Calendar Events] Filtered out ${allEvents.length - validEvents.length} events without valid time data`);
    }

    // 6. Enrich events with calendar color and metadata
    const enrichedEvents = validEvents.map((event: any) => {
      const calendarInfo = calendarColorMap.get(event.calendarId);

      // Convert hex color to named color for our color system
      const hexToColorName = (hex: string): string => {
        const colorMapping: Record<string, string> = {
          '#3b82f6': 'blue',    // Blue
          '#10b981': 'green',   // Green
          '#ef4444': 'red',     // Red
          '#8b5cf6': 'purple',  // Purple
          '#f59e0b': 'orange',  // Orange
          '#ec4899': 'pink',    // Pink
          '#eab308': 'yellow',  // Yellow
          '#6b7280': 'gray',    // Gray
        };

        // Try exact match first
        if (colorMapping[hex.toLowerCase()]) {
          return colorMapping[hex.toLowerCase()];
        }

        // Otherwise, map based on hue
        if (!hex || hex === '') return 'blue';

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Simple color detection based on RGB values
        if (r > g && r > b) return 'red';
        if (g > r && g > b) return 'green';
        if (b > r && b > g) return 'blue';
        if (r > 150 && g > 150 && b < 100) return 'yellow';
        if (r > 150 && g < 100 && b > 150) return 'pink';
        if (r > 200 && g > 100 && g < 150 && b < 100) return 'orange';
        if (r > 100 && b > 150) return 'purple';

        return 'blue'; // Default
      };

      return {
        ...event,
        // Add calendar metadata
        calendarName: calendarInfo?.name,
        calendarIsPrimary: calendarInfo?.isPrimary,
        // Add color from calendar (overrides event.color if present)
        color: calendarInfo ? hexToColorName(calendarInfo.hexColor) : (event.color || 'blue'),
        hexColor: calendarInfo?.hexColor,
      };
    });

    console.log('[Calendar Events] Enriched', enrichedEvents.length, 'events with calendar colors');
    if (enrichedEvents.length > 0) {
      console.log('[Calendar Events] Sample enriched event:', {
        id: enrichedEvents[0].id,
        title: enrichedEvents[0].title,
        calendarName: enrichedEvents[0].calendarName,
        color: enrichedEvents[0].color,
        hexColor: enrichedEvents[0].hexColor,
      });
    }

    // ✅ Cache the response
    const response = {
      success: true,
      events: enrichedEvents,
    };

    eventsCache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
    });

    // ✅ Cleanup old cache entries (keep max 50 entries)
    if (eventsCache.size > 50) {
      const oldestKey = eventsCache.keys().next().value;
      if (oldestKey) eventsCache.delete(oldestKey);
    }

    return NextResponse.json(response);
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
