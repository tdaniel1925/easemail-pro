/**
 * Google Calendar Sync API
 * POST - Trigger sync from Google Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncFromGoogleCalendar, pushToGoogleCalendar } from '@/lib/calendar/google-calendar-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, eventId, action } = await request.json();
    
    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }
    
    // Handle different sync actions
    if (action === 'push' && eventId) {
      // Push single event to Google Calendar
      const result = await pushToGoogleCalendar(eventId, accountId);
      return NextResponse.json(result);
    } else {
      // Sync from Google Calendar (default)
      const result = await syncFromGoogleCalendar(user.id, accountId);
      return NextResponse.json(result);
    }

  } catch (error: any) {
    console.error('❌ Google Calendar sync error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Sync failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

