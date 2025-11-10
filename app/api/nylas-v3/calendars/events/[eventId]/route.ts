/**
 * Nylas v3 - Single Calendar Event
 * Get, update, and delete calendar events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { handleNylasError } from '@/lib/nylas-v3/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const calendarId = searchParams.get('calendarId');
    const eventId = params.eventId;

    if (!accountId || !eventId) {
      return NextResponse.json(
        { error: 'Account ID and Event ID required' },
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

    // 3. Fetch event from Nylas v3
    const nylas = getNylasClient();

    const queryParams: any = {};
    if (calendarId) {
      queryParams.calendar_id = calendarId;
    }

    const event = await nylas.events.find({
      identifier: account.nylasGrantId,
      eventId: eventId,
      queryParams,
    });

    console.log('[Calendar Event] Fetched event:', eventId);

    return NextResponse.json({
      success: true,
      event: event.data,
    });
  } catch (error) {
    console.error('[Calendar Event] Error fetching event:', error);
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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
    const eventId = params.eventId;

    if (!accountId || !eventId) {
      return NextResponse.json(
        { error: 'Account ID and Event ID required' },
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

    // 3. Prepare update data
    const updateData: any = {};

    if (title !== undefined) {
      updateData.title = title;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (when) {
      updateData.when = when;
    }

    if (participants) {
      updateData.participants = participants.map((p: any) => ({
        email: p.email,
        name: p.name || undefined,
        status: p.status || 'noreply',
      }));
    }

    if (location !== undefined) {
      updateData.location = location;
    }

    if (conferencing !== undefined) {
      updateData.conferencing = conferencing;
    }

    if (busy !== undefined) {
      updateData.busy = busy;
    }

    if (reminders !== undefined) {
      updateData.reminders = reminders;
    }

    // 4. Update event via Nylas v3
    const nylas = getNylasClient();

    const queryParams: any = {};
    if (calendarId) {
      queryParams.calendar_id = calendarId;
    }

    const response = await nylas.events.update({
      identifier: account.nylasGrantId,
      eventId: eventId,
      requestBody: updateData,
      queryParams,
    });

    console.log('[Calendar Event] Updated event:', eventId);

    return NextResponse.json({
      success: true,
      event: response.data,
    });
  } catch (error) {
    console.error('[Calendar Event] Error updating event:', error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const calendarId = searchParams.get('calendarId');
    const eventId = params.eventId;

    if (!accountId || !eventId) {
      return NextResponse.json(
        { error: 'Account ID and Event ID required' },
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

    // 3. Delete event via Nylas v3
    const nylas = getNylasClient();

    const queryParams: any = {};
    if (calendarId) {
      queryParams.calendar_id = calendarId;
    }

    await nylas.events.destroy({
      identifier: account.nylasGrantId,
      eventId: eventId,
      queryParams,
    });

    console.log('[Calendar Event] Deleted event:', eventId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('[Calendar Event] Error deleting event:', error);
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
