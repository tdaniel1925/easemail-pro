import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailTrackingEvents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Email tracking pixel endpoint
 * GET /api/tracking/pixel/[trackingId]
 * Returns a 1x1 transparent GIF and records the open event
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  try {
    const { trackingId } = params;

    if (!trackingId) {
      return new NextResponse(null, { status: 400 });
    }

    // Get user agent and IP
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || undefined;

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

      // Update tracking event
      await db
        .update(emailTrackingEvents)
        .set({
          opened: true,
          openCount: (trackingEvent.openCount || 0) + 1,
          firstOpenedAt: trackingEvent.firstOpenedAt || now,
          lastOpenedAt: now,
          userAgent,
          ipAddress,
          device,
          updatedAt: now,
        })
        .where(eq(emailTrackingEvents.id, trackingEvent.id));
    }

    // Return 1x1 transparent GIF
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Tracking pixel error:', error);

    // Still return pixel even on error (don't reveal tracking failed)
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(pixel, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': pixel.length.toString(),
      },
    });
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
