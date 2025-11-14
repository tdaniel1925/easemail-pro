/**
 * Nylas Calendar Sync API
 * POST - Trigger sync from Nylas Calendar
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncFromNylasCalendar } from '@/lib/calendar/nylas-calendar-sync';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Sync from Nylas Calendar
    const result = await syncFromNylasCalendar(user.id, accountId);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Nylas Calendar sync error:', error);
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
