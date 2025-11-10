/**
 * Email Tracking Stats API
 * Get tracking statistics for a specific email
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmailTrackingStats } from '@/lib/email-tracking';

export const dynamic = 'force-dynamic';

/**
 * GET - Get tracking stats for a specific tracking ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const { trackingId } = params;

    // Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tracking stats
    const stats = await getEmailTrackingStats(trackingId);

    if (!stats) {
      return NextResponse.json({
        error: 'Tracking data not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Tracking Stats] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch tracking stats',
    }, { status: 500 });
  }
}
