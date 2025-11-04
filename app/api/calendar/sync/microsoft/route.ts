/**
 * Microsoft Calendar Sync API
 * POST - Trigger sync from Microsoft Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncFromMicrosoftCalendar, pushToMicrosoftCalendar } from '@/lib/calendar/microsoft-calendar-sync';

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
      // Push single event to Microsoft Calendar
      const result = await pushToMicrosoftCalendar(eventId, accountId);
      return NextResponse.json(result);
    } else {
      // Sync from Microsoft Calendar (default)
      const result = await syncFromMicrosoftCalendar(user.id, accountId);
      return NextResponse.json(result);
    }

  } catch (error: any) {
    console.error('❌ Microsoft Calendar sync error:', error);
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

