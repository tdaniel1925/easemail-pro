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
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
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

    // 3. Build query parameters
    const queryParams: any = {};

    if (calendarId) {
      queryParams.calendar_id = calendarId;
    }

    if (start) {
      queryParams.start = parseInt(start);
    }

    if (end) {
      queryParams.end = parseInt(end);
    }

    // 4. Fetch events from Nylas v3
    const nylas = getNylasClient();

    const events = await nylas.events.list({
      identifier: account.nylasGrantId,
      queryParams,
    });

    console.log('[Calendar Events] Fetched events:', events.data.length);

    return NextResponse.json({
      success: true,
      events: events.data,
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
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
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
