/**
 * Calendar Events Search API (Nylas v3)
 * GET /api/search/events
 * Search calendar events
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Nylas from 'nylas';

export const dynamic = 'force-dynamic';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const query = searchParams.get('query');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Account ID is required',
      }, { status: 400 });
    }

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required',
      }, { status: 400 });
    }

    console.log(`[Event Search] Searching for "${query}" in account ${accountId}`);

    // Calculate default date range (next 90 days if not specified)
    const now = new Date();
    const defaultStart = Math.floor(now.getTime() / 1000);
    const defaultEnd = Math.floor(now.getTime() / 1000) + (90 * 24 * 60 * 60); // 90 days

    const startTime_unix = start ? Math.floor(new Date(start).getTime() / 1000) : defaultStart;
    const endTime_unix = end ? Math.floor(new Date(end).getTime() / 1000) : defaultEnd;

    // Fetch events from Nylas v3
    const events = await nylas.events.list({
      identifier: accountId,
      queryParams: {
        start: startTime_unix,
        end: endTime_unix,
        limit,
      },
    });

    // Client-side filtering by query (since Nylas doesn't support native event search)
    const queryLower = query.toLowerCase();
    const filteredEvents = events.data.filter((event: any) => {
      const title = (event.title || '').toLowerCase();
      const description = (event.description || '').toLowerCase();
      const location = (event.location || '').toLowerCase();

      // Check attendees
      const attendeeEmails = (event.participants || [])
        .map((p: any) => (p.email || '').toLowerCase())
        .join(' ');

      const attendeeNames = (event.participants || [])
        .map((p: any) => (p.name || '').toLowerCase())
        .join(' ');

      return (
        title.includes(queryLower) ||
        description.includes(queryLower) ||
        location.includes(queryLower) ||
        attendeeEmails.includes(queryLower) ||
        attendeeNames.includes(queryLower)
      );
    }).slice(0, limit);

    // Format results
    const formattedEvents = filteredEvents.map((event: any) => ({
      id: event.id,
      calendar_id: event.calendarId,
      title: event.title || '(No Title)',
      description: event.description,
      location: event.location,
      start_time: event.when?.startTime || event.when?.date,
      end_time: event.when?.endTime || event.when?.date,
      participants: event.participants || [],
      organizer: event.organizer,
      status: event.status,
      busy: event.busy,
    }));

    const took_ms = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      events: formattedEvents,
      total: formattedEvents.length,
      took_ms,
    });
  } catch (error: any) {
    console.error('❌ Event search error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Event search failed',
        details: error.message,
        took_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
