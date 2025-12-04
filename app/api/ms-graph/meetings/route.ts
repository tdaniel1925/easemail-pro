/**
 * MS Graph Meetings API
 *
 * GET /api/ms-graph/meetings - Get upcoming meetings
 * POST /api/ms-graph/meetings - Create a new Teams meeting
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { msGraphAccounts, msMeetingsCache } from '@/lib/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { MSGraphTeamsClient, refreshAccessToken } from '@/lib/ms-graph/client';

async function getValidAccessToken(account: any): Promise<string> {
  const tokenExpiresAt = new Date(account.tokenExpiresAt);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (tokenExpiresAt > fiveMinutesFromNow) {
    return account.accessToken;
  }

  console.log('[MS Graph Meetings] Refreshing access token...');
  const newTokens = await refreshAccessToken(account.refreshToken);

  await db.update(msGraphAccounts)
    .set({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
      refreshFailures: 0,
      updatedAt: new Date(),
    })
    .where(eq(msGraphAccounts.id, account.id));

  return newTokens.accessToken;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const msAccount = await db.query.msGraphAccounts.findFirst({
      where: eq(msGraphAccounts.userId, user.id),
    });

    if (!msAccount) {
      return NextResponse.json(
        { error: 'MS Teams not connected' },
        { status: 404 }
      );
    }

    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    console.log('[MS Graph Meetings] Getting upcoming meetings...');

    // Get calendar events with Teams meetings for the next 7 days
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const meetings = await teamsClient.getCalendarEventsWithTeamsMeetings(
      now.toISOString(),
      oneWeekFromNow.toISOString()
    );

    // Format meetings for response
    const formattedMeetings = meetings.map((meeting: any) => ({
      id: meeting.id,
      subject: meeting.subject,
      start: meeting.start,
      end: meeting.end,
      isOnlineMeeting: meeting.isOnlineMeeting,
      onlineMeetingUrl: meeting.onlineMeeting?.joinUrl,
      organizer: meeting.organizer?.emailAddress,
      attendees: meeting.attendees?.map((a: any) => ({
        email: a.emailAddress?.address,
        name: a.emailAddress?.name,
        status: a.status?.response,
      })),
      location: meeting.location?.displayName,
      bodyPreview: meeting.bodyPreview,
    }));

    return NextResponse.json({
      success: true,
      meetings: formattedMeetings,
    });
  } catch (error) {
    console.error('[MS Graph Meetings] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get meetings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const msAccount = await db.query.msGraphAccounts.findFirst({
      where: eq(msGraphAccounts.userId, user.id),
    });

    if (!msAccount) {
      return NextResponse.json(
        { error: 'MS Teams not connected' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { subject, startDateTime, endDateTime, attendees, body: meetingBody, timeZone = 'UTC' } = body;

    if (!subject || !startDateTime || !endDateTime) {
      return NextResponse.json(
        { error: 'subject, startDateTime, and endDateTime are required' },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(msAccount);
    const teamsClient = new MSGraphTeamsClient(accessToken);

    console.log('[MS Graph Meetings] Creating Teams meeting:', subject);

    const meeting = await teamsClient.createCalendarEventWithTeamsMeeting({
      subject,
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
      attendees: attendees?.map((email: string) => ({
        emailAddress: { address: email },
      })),
      body: meetingBody ? { contentType: 'text', content: meetingBody } : undefined,
    });

    // Cache meeting in database
    if (meeting.onlineMeeting?.joinUrl) {
      await db.insert(msMeetingsCache)
        .values({
          msAccountId: msAccount.id,
          msMeetingId: meeting.id,
          subject: meeting.subject,
          startDateTime: new Date(meeting.start.dateTime),
          endDateTime: new Date(meeting.end.dateTime),
          joinWebUrl: meeting.onlineMeeting.joinUrl,
          organizerDisplayName: meeting.organizer?.emailAddress?.name,
          participants: meeting.attendees?.map((a: any) => ({
            displayName: a.emailAddress?.name,
            email: a.emailAddress?.address,
          })),
          status: 'scheduled',
          lastSyncedAt: new Date(),
        })
        .onConflictDoNothing();
    }

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        subject: meeting.subject,
        start: meeting.start,
        end: meeting.end,
        joinUrl: meeting.onlineMeeting?.joinUrl,
        webLink: meeting.webLink,
      },
    });
  } catch (error) {
    console.error('[MS Graph Meetings] Create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
