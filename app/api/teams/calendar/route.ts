// Teams Calendar API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTeamsClient } from '@/lib/teams/teams-client';
import { getValidAccessToken, encryptTokens } from '@/lib/teams/teams-auth';

export const dynamic = 'force-dynamic';

// GET - Get calendar events
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const eventId = searchParams.get('eventId');
    const startDateTime = searchParams.get('startDateTime');
    const endDateTime = searchParams.get('endDateTime');
    const top = searchParams.get('top');
    const teamsOnly = searchParams.get('teamsOnly') === 'true';

    // Get the Teams account
    let account;
    if (accountId) {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.id, accountId),
            eq(teamsAccounts.userId, user.id)
          )
        )
        .limit(1);
    } else {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.userId, user.id),
            eq(teamsAccounts.isActive, true)
          )
        )
        .limit(1);
    }

    if (!account?.length) {
      return NextResponse.json({ error: 'Teams account not found' }, { status: 404 });
    }

    const teamsAccount = account[0];
    const { accessToken, refreshed, newTokens } = await getValidAccessToken(
      teamsAccount.accessToken,
      teamsAccount.refreshToken,
      teamsAccount.tokenExpiresAt
    );

    // Update tokens if refreshed
    if (refreshed && newTokens) {
      const encrypted = encryptTokens(newTokens);
      await db
        .update(teamsAccounts)
        .set({
          accessToken: encrypted.accessToken,
          refreshToken: encrypted.refreshToken,
          tokenExpiresAt: encrypted.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(teamsAccounts.id, teamsAccount.id));
    }

    const client = createTeamsClient(accessToken);

    if (eventId) {
      // Get a single event
      const event = await client.getCalendarEvent(eventId);
      return NextResponse.json({ success: true, event });
    }

    // Get calendar events
    const events = await client.getCalendarEvents({
      startDateTime: startDateTime || undefined,
      endDateTime: endDateTime || undefined,
      top: top ? parseInt(top) : 100,
      orderBy: 'start/dateTime',
    });

    let resultEvents = events.value;

    // Filter to only Teams meetings if requested
    if (teamsOnly) {
      resultEvents = resultEvents.filter(e => e.isOnlineMeeting);
    }

    return NextResponse.json({
      success: true,
      events: resultEvents,
      nextLink: events['@odata.nextLink'],
    });
  } catch (error) {
    console.error('Error fetching Teams calendar events:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

// POST - Create a calendar event
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountId,
      subject,
      startDateTime,
      endDateTime,
      timeZone,
      location,
      body: eventBody,
      attendees,
      isOnlineMeeting,
      isAllDay,
      reminderMinutes,
      showAs,
      importance,
      categories,
    } = body;

    // Get the Teams account
    let account;
    if (accountId) {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.id, accountId),
            eq(teamsAccounts.userId, user.id)
          )
        )
        .limit(1);
    } else {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.userId, user.id),
            eq(teamsAccounts.isActive, true)
          )
        )
        .limit(1);
    }

    if (!account?.length) {
      return NextResponse.json({ error: 'Teams account not found' }, { status: 404 });
    }

    const teamsAccount = account[0];
    const { accessToken, refreshed, newTokens } = await getValidAccessToken(
      teamsAccount.accessToken,
      teamsAccount.refreshToken,
      teamsAccount.tokenExpiresAt
    );

    // Update tokens if refreshed
    if (refreshed && newTokens) {
      const encrypted = encryptTokens(newTokens);
      await db
        .update(teamsAccounts)
        .set({
          accessToken: encrypted.accessToken,
          refreshToken: encrypted.refreshToken,
          tokenExpiresAt: encrypted.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(teamsAccounts.id, teamsAccount.id));
    }

    const client = createTeamsClient(accessToken);

    const event = await client.createCalendarEvent({
      subject: subject || 'New Event',
      start: {
        dateTime: startDateTime,
        timeZone: timeZone || 'UTC',
      },
      end: {
        dateTime: endDateTime,
        timeZone: timeZone || 'UTC',
      },
      location: location ? { displayName: location } : undefined,
      body: eventBody ? { content: eventBody, contentType: 'html' } : undefined,
      attendees: attendees?.map((a: any) => ({
        email: a.email,
        name: a.name,
        type: a.type || 'required',
      })),
      isOnlineMeeting: isOnlineMeeting ?? false,
      onlineMeetingProvider: isOnlineMeeting ? 'teamsForBusiness' : undefined,
      isAllDay: isAllDay ?? false,
      reminderMinutesBeforeStart: reminderMinutes ?? 15,
      showAs: showAs ?? 'busy',
      importance: importance ?? 'normal',
      categories,
    });

    return NextResponse.json({
      success: true,
      event,
      joinUrl: event.onlineMeeting?.joinUrl,
    });
  } catch (error) {
    console.error('Error creating Teams calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}

// PATCH - Update a calendar event or RSVP
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      accountId,
      eventId,
      action,
      // For RSVP
      response,
      comment,
      sendResponse,
      // For update
      subject,
      startDateTime,
      endDateTime,
      timeZone,
      location,
      body: eventBody,
      isOnlineMeeting,
      showAs,
    } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get the Teams account
    let account;
    if (accountId) {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.id, accountId),
            eq(teamsAccounts.userId, user.id)
          )
        )
        .limit(1);
    } else {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.userId, user.id),
            eq(teamsAccounts.isActive, true)
          )
        )
        .limit(1);
    }

    if (!account?.length) {
      return NextResponse.json({ error: 'Teams account not found' }, { status: 404 });
    }

    const teamsAccount = account[0];
    const { accessToken, refreshed, newTokens } = await getValidAccessToken(
      teamsAccount.accessToken,
      teamsAccount.refreshToken,
      teamsAccount.tokenExpiresAt
    );

    // Update tokens if refreshed
    if (refreshed && newTokens) {
      const encrypted = encryptTokens(newTokens);
      await db
        .update(teamsAccounts)
        .set({
          accessToken: encrypted.accessToken,
          refreshToken: encrypted.refreshToken,
          tokenExpiresAt: encrypted.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(teamsAccounts.id, teamsAccount.id));
    }

    const client = createTeamsClient(accessToken);

    if (action === 'rsvp') {
      // RSVP to event
      if (!response || !['accept', 'tentativelyAccept', 'decline'].includes(response)) {
        return NextResponse.json({ error: 'Valid response is required (accept, tentativelyAccept, decline)' }, { status: 400 });
      }

      await client.respondToCalendarEvent(eventId, response, comment, sendResponse ?? true);
      return NextResponse.json({ success: true });
    }

    // Update event
    const updates: Record<string, any> = {};
    if (subject) updates.subject = subject;
    if (startDateTime && timeZone) {
      updates.start = { dateTime: startDateTime, timeZone };
    }
    if (endDateTime && timeZone) {
      updates.end = { dateTime: endDateTime, timeZone };
    }
    if (location !== undefined) {
      updates.location = location ? { displayName: location } : null;
    }
    if (eventBody !== undefined) {
      updates.body = eventBody ? { content: eventBody, contentType: 'html' } : null;
    }
    if (isOnlineMeeting !== undefined) {
      updates.isOnlineMeeting = isOnlineMeeting;
    }
    if (showAs) {
      updates.showAs = showAs;
    }

    const event = await client.updateCalendarEvent(eventId, updates);
    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Error updating Teams calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a calendar event
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get the Teams account
    let account;
    if (accountId) {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.id, accountId),
            eq(teamsAccounts.userId, user.id)
          )
        )
        .limit(1);
    } else {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.userId, user.id),
            eq(teamsAccounts.isActive, true)
          )
        )
        .limit(1);
    }

    if (!account?.length) {
      return NextResponse.json({ error: 'Teams account not found' }, { status: 404 });
    }

    const teamsAccount = account[0];
    const { accessToken, refreshed, newTokens } = await getValidAccessToken(
      teamsAccount.accessToken,
      teamsAccount.refreshToken,
      teamsAccount.tokenExpiresAt
    );

    // Update tokens if refreshed
    if (refreshed && newTokens) {
      const encrypted = encryptTokens(newTokens);
      await db
        .update(teamsAccounts)
        .set({
          accessToken: encrypted.accessToken,
          refreshToken: encrypted.refreshToken,
          tokenExpiresAt: encrypted.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(teamsAccounts.id, teamsAccount.id));
    }

    const client = createTeamsClient(accessToken);

    await client.deleteCalendarEvent(eventId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Teams calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
