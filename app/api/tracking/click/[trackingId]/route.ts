import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailTrackingEvents, emailLinkClicks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Link click tracking endpoint
 * GET /api/tracking/click/[trackingId]?url=<encoded_url>&index=<link_index>
 * Records the click and redirects to the original URL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const { trackingId } = params;
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const index = searchParams.get('index');

    if (!trackingId || !url) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Decode the URL
    const targetUrl = decodeURIComponent(url);

    // Get user agent and IP
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || undefined;
    const referrer = request.headers.get('referer') || undefined;

    // Parse user agent for device info
    const device = parseUserAgent(userAgent);

    // Find tracking event
    const [trackingEvent] = await db
      .select()
      .from(emailTrackingEvents)
      .where(eq(emailTrackingEvents.trackingId, trackingId))
      .limit(1);

    if (trackingEvent) {
      const now = new Date();

      // Update tracking event click counts
      await db
        .update(emailTrackingEvents)
        .set({
          clickCount: (trackingEvent.clickCount || 0) + 1,
          firstClickedAt: trackingEvent.firstClickedAt || now,
          lastClickedAt: now,
          updatedAt: now,
        })
        .where(eq(emailTrackingEvents.id, trackingEvent.id));

      // Record individual click
      await db.insert(emailLinkClicks).values({
        trackingEventId: trackingEvent.id,
        linkUrl: targetUrl,
        linkText: null, // We don't have this info from the redirect
        linkIndex: index ? parseInt(index, 10) : 0,
        userAgent,
        ipAddress,
        referrer,
        device,
        clickedAt: now,
      });
    }

    // Redirect to the original URL
    return NextResponse.redirect(targetUrl);
  } catch (error) {
    console.error('Link click tracking error:', error);

    // Try to redirect to the URL anyway
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (url) {
      try {
        const targetUrl = decodeURIComponent(url);
        return NextResponse.redirect(targetUrl);
      } catch {
        // If URL decode fails, redirect to home
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.redirect(new URL('/', request.url));
  }
}

/**
 * Parse user agent to extract device information
 */
function parseUserAgent(userAgent?: string): {
  type?: string;
  browser?: string;
  os?: string;
} {
  if (!userAgent) return {};

  const ua = userAgent.toLowerCase();

  // Detect device type
  let type = 'desktop';
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
    type = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
    type = 'mobile';
  }

  // Detect browser
  let browser = 'unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';
  else if (ua.includes('msie') || ua.includes('trident')) browser = 'Internet Explorer';

  // Detect OS
  let os = 'unknown';
  if (ua.includes('win')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return { type, browser, os };
}
