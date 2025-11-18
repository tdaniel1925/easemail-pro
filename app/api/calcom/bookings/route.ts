import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchCalcomBookings,
  CalcomFetchOptions,
  CalcomBooking,
} from '@/lib/calcom/calcom-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calcom/bookings
 * Fetch bookings from Cal.com API and sync to database
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Cal.com connection for user
    const { data: connection, error: connError } = await supabase
      .from('calcom_connections')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      return NextResponse.json({
        error: 'No active Cal.com connection found',
        details: 'Please connect your Cal.com account in settings',
      }, { status: 404 });
    }

    // Parse query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status')?.split(',');
    const afterStart = searchParams.get('afterStart');
    const beforeEnd = searchParams.get('beforeEnd');
    const fromDb = searchParams.get('fromDb') === 'true'; // If true, fetch from DB instead of API

    if (fromDb) {
      // Fetch from database
      let query = supabase
        .from('calcom_bookings')
        .select('*')
        .eq('user_id', session.user.id)
        .order('start_time', { ascending: true });

      if (status && status.length > 0) {
        query = query.in('status', status);
      }
      if (afterStart) {
        query = query.gte('start_time', afterStart);
      }
      if (beforeEnd) {
        query = query.lte('end_time', beforeEnd);
      }

      const { data: bookings, error: dbError } = await query;

      if (dbError) {
        return NextResponse.json({
          error: 'Failed to fetch bookings from database',
          details: dbError.message,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        source: 'database',
        bookings: bookings || [],
        count: bookings?.length || 0,
      });
    }

    // Fetch from Cal.com API
    const fetchOptions: CalcomFetchOptions = {
      status: status || ['ACCEPTED', 'PENDING'],
    };

    if (afterStart) {
      fetchOptions.afterStart = afterStart;
    }
    if (beforeEnd) {
      fetchOptions.beforeEnd = beforeEnd;
    }

    console.log('[Cal.com Bookings] Fetching from API with options:', fetchOptions);

    const result = await fetchCalcomBookings(connection.api_key, fetchOptions);

    if (result.status === 'error') {
      return NextResponse.json({
        error: 'Failed to fetch bookings from Cal.com',
        details: result.error,
      }, { status: 500 });
    }

    const bookings = result.data || [];

    // Sync bookings to database
    console.log('[Cal.com Bookings] Syncing', bookings.length, 'bookings to database');

    const syncedBookings = [];
    for (const booking of bookings) {
      try {
        const { data: synced, error: syncError } = await supabase
          .from('calcom_bookings')
          .upsert({
            user_id: session.user.id,
            calcom_connection_id: connection.id,
            booking_id: booking.id,
            booking_uid: booking.uid,
            event_type_id: booking.eventTypeId,
            event_type_title: booking.eventType?.title || 'Unknown Event',
            title: booking.title,
            description: booking.description,
            start_time: booking.startTime,
            end_time: booking.endTime,
            status: booking.status,
            organizer_name: booking.organizer?.name,
            organizer_email: booking.organizer?.email,
            organizer_timezone: booking.organizer?.timezone,
            attendees: booking.attendees || [],
            location: booking.location,
            meeting_url: booking.meetingUrl,
            custom_inputs: booking.customInputs || {},
            metadata: booking.metadata || {},
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,booking_uid',
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (!syncError && synced) {
          syncedBookings.push(synced);
        }
      } catch (syncErr) {
        console.error('[Cal.com Bookings] Sync error for booking', booking.uid, syncErr);
      }
    }

    // Update last_synced_at
    await supabase
      .from('calcom_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', connection.id);

    console.log('[Cal.com Bookings] Successfully synced', syncedBookings.length, 'bookings');

    return NextResponse.json({
      success: true,
      source: 'api',
      bookings: syncedBookings,
      count: syncedBookings.length,
      lastSynced: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Cal.com Bookings] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch Cal.com bookings',
      details: error.message,
    }, { status: 500 });
  }
}
