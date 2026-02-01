/**
 * Email Tracking List API
 * Get all tracking statistics for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailTrackingEvents } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET - Get all tracking stats for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tracking events for this user
    const trackingEvents = await db
      .select()
      .from(emailTrackingEvents)
      .where(eq(emailTrackingEvents.userId, user.id))
      .orderBy(desc(emailTrackingEvents.sentAt))
      .limit(100); // Limit to most recent 100

    const stats = trackingEvents.map(event => ({
      trackingId: event.trackingId,
      recipientEmail: event.recipientEmail,
      subject: event.subject,
      sentAt: event.sentAt,
      opened: event.opened || false,
      openCount: event.openCount || 0,
      firstOpenedAt: event.firstOpenedAt,
      lastOpenedAt: event.lastOpenedAt,
      clickCount: event.clickCount || 0,
      firstClickedAt: event.firstClickedAt,
      lastClickedAt: event.lastClickedAt,
      delivered: event.delivered || false,
      deliveredAt: event.deliveredAt,
      bounced: event.bounced || false,
      bouncedAt: event.bouncedAt,
      bounceReason: event.bounceReason,
      device: event.device,
      location: event.location,
    }));

    return NextResponse.json({
      success: true,
      stats,
      count: stats.length,
    });
  } catch (error) {
    console.error('[Tracking List] Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch tracking stats',
    }, { status: 500 });
  }
}
