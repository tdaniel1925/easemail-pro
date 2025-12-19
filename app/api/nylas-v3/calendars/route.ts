/**
 * Nylas v3 - Calendars
 * List calendars for an account
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

    // 3. Fetch calendars from Nylas v3
    const nylas = getNylasClient();

    const calendars = await nylas.calendars.list({
      identifier: account.nylasGrantId,
    });

    console.log('[Calendars] Fetched calendars:', calendars.data.length);

    // Debug: Log calendar properties to diagnose readOnly issues
    calendars.data.slice(0, 5).forEach((cal: any) => {
      console.log('[Calendars] Calendar details:', {
        id: cal.id?.substring(0, 30) + '...',
        name: cal.name,
        readOnly: cal.readOnly,
        read_only: cal.read_only,
        isReadOnly: cal.isReadOnly,
        is_read_only: cal.is_read_only,
        isPrimary: cal.isPrimary,
        is_primary: cal.is_primary,
      });
    });

    // Normalize the calendar data - Nylas v3 SDK returns snake_case properties
    // but may also have camelCase depending on SDK version
    const normalizedCalendars = calendars.data.map((cal: any) => ({
      ...cal,
      // Handle both snake_case and camelCase property names
      readOnly: cal.readOnly ?? cal.read_only ?? cal.isReadOnly ?? cal.is_read_only ?? false,
      isPrimary: cal.isPrimary ?? cal.is_primary ?? false,
    }));

    return NextResponse.json({
      success: true,
      calendars: normalizedCalendars,
    });
  } catch (error) {
    console.error('[Calendars] Error fetching calendars:', error);
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
    const { accountId, name, description, hexColor, timezone } = body;

    if (!accountId || !name) {
      return NextResponse.json(
        { error: 'Account ID and calendar name are required' },
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

    // 3. Create calendar via Nylas v3
    const nylas = getNylasClient();

    const calendar = await nylas.calendars.create({
      identifier: account.nylasGrantId,
      requestBody: {
        name,
        description: description || '',
        location: '',
        timezone: timezone || 'America/New_York',
        // @ts-expect-error - hexColor is supported but not in type definition
        hexColor: hexColor || '#3b82f6',
      },
    });

    console.log('[Calendars] Created calendar:', calendar.data.id);

    return NextResponse.json({
      success: true,
      calendar: calendar.data,
    });
  } catch (error) {
    console.error('[Calendars] Error creating calendar:', error);
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
