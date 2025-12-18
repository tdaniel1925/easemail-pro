// Teams Meetings API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createTeamsClient } from '@/lib/teams/teams-client';
import { getValidAccessToken, encryptTokens } from '@/lib/teams/teams-auth';

export const dynamic = 'force-dynamic';

// GET - List meetings or get a specific meeting
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const accountId = searchParams.get('accountId');

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

    // Get valid access token
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

    if (meetingId) {
      const meeting = await client.getOnlineMeeting(meetingId);
      return NextResponse.json({ success: true, meeting });
    }

    // For listing meetings, we'll get upcoming calendar events with online meetings
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

    const events = await client.getCalendarEvents({
      startDateTime: now.toISOString(),
      endDateTime: futureDate.toISOString(),
      top: 50,
      orderBy: 'start/dateTime',
    });

    // Filter to only online meetings
    const meetings = events.value.filter(e => e.isOnlineMeeting);

    return NextResponse.json({
      success: true,
      meetings,
    });
  } catch (error) {
    console.error('Error fetching Teams meetings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST - Create a new meeting
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
      participants,
      isInstant,
      createCalendarEvent,
      timeZone,
      location,
      body: eventBody,
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

    if (isInstant) {
      // Create instant "Meet Now" meeting
      const meeting = await client.createInstantMeeting(subject);
      return NextResponse.json({
        success: true,
        meeting,
        joinUrl: meeting.joinWebUrl,
      });
    }

    if (createCalendarEvent) {
      // Create a calendar event with Teams meeting
      const event = await client.createCalendarEvent({
        subject: subject || 'Teams Meeting',
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
        attendees: participants?.map((p: any) => ({
          email: p.email,
          name: p.name,
          type: 'required' as const,
        })),
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness',
      });

      return NextResponse.json({
        success: true,
        event,
        joinUrl: event.onlineMeeting?.joinUrl,
      });
    }

    // Create standalone online meeting
    const meeting = await client.createOnlineMeeting({
      subject: subject || 'Teams Meeting',
      startDateTime,
      endDateTime,
      participants,
    });

    return NextResponse.json({
      success: true,
      meeting,
      joinUrl: meeting.joinWebUrl,
    });
  } catch (error) {
    console.error('Error creating Teams meeting:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
