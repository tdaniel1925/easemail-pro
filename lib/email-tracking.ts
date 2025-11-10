import { db } from './db/drizzle';
import { emailTrackingEvents } from './db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * Email tracking utilities
 */

export interface TrackingOptions {
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailTrackingResult {
  trackingId: string;
  htmlWithTracking: string;
}

/**
 * Generate a unique tracking ID
 */
export function generateTrackingId(): string {
  return nanoid(32);
}

/**
 * Create a tracking event in the database
 */
export async function createTrackingEvent(data: {
  userId: string;
  emailId?: string;
  draftId?: string;
  recipientEmail: string;
  subject: string | null;
  trackingId: string;
}): Promise<void> {
  await db.insert(emailTrackingEvents).values({
    userId: data.userId,
    emailId: data.emailId || null,
    draftId: data.draftId || null,
    trackingId: data.trackingId,
    recipientEmail: data.recipientEmail,
    subject: data.subject,
    sentAt: new Date(),
  });
}

/**
 * Add tracking to HTML email content
 */
export function addTrackingToHtml(
  html: string,
  trackingId: string,
  options: TrackingOptions = {},
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
): string {
  const { trackOpens = true, trackClicks = true } = options;

  let trackedHtml = html;

  // Add tracking pixel for open tracking
  if (trackOpens) {
    const trackingPixelUrl = `${baseUrl}/api/tracking/pixel/${trackingId}`;
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none !important;" alt="" />`;

    // Try to insert before closing body tag
    if (trackedHtml.includes('</body>')) {
      trackedHtml = trackedHtml.replace('</body>', `${trackingPixel}</body>`);
    } else {
      // Otherwise append to the end
      trackedHtml += trackingPixel;
    }
  }

  // Add click tracking to links
  if (trackClicks) {
    let linkIndex = 0;
    trackedHtml = trackedHtml.replace(
      /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi,
      (match, attributes, originalUrl) => {
        // Skip tracking pixel and mailto links
        if (originalUrl.startsWith('mailto:') || originalUrl.includes('/api/tracking/')) {
          return match;
        }

        try {
          const encodedUrl = encodeURIComponent(originalUrl);
          const trackingUrl = `${baseUrl}/api/tracking/click/${trackingId}?url=${encodedUrl}&index=${linkIndex}`;
          linkIndex++;

          // Replace the href attribute
          const newAttributes = attributes.replace(
            /href=["'][^"']+["']/i,
            `href="${trackingUrl}"`
          );

          return `<a ${newAttributes}>`;
        } catch (error) {
          console.error('Error creating tracking link:', error);
          return match; // Return original if error
        }
      }
    );
  }

  return trackedHtml;
}

/**
 * Process email for tracking before sending
 * This is the main function to use when sending emails
 */
export async function processEmailForTracking(params: {
  userId: string;
  recipientEmail: string;
  subject: string | null;
  htmlBody: string;
  emailId?: string;
  draftId?: string;
  trackingOptions?: TrackingOptions;
  baseUrl?: string;
}): Promise<EmailTrackingResult> {
  const {
    userId,
    recipientEmail,
    subject,
    htmlBody,
    emailId,
    draftId,
    trackingOptions = { trackOpens: true, trackClicks: true },
    baseUrl,
  } = params;

  // Generate tracking ID
  const trackingId = generateTrackingId();

  // Create tracking event in database
  await createTrackingEvent({
    userId,
    emailId,
    draftId,
    recipientEmail,
    subject,
    trackingId,
  });

  // Add tracking to HTML
  const htmlWithTracking = addTrackingToHtml(htmlBody, trackingId, trackingOptions, baseUrl);

  return {
    trackingId,
    htmlWithTracking,
  };
}

/**
 * Get tracking stats for an email
 */
export async function getEmailTrackingStats(trackingId: string) {
  const [event] = await db
    .select()
    .from(emailTrackingEvents)
    .where(eq(emailTrackingEvents.trackingId, trackingId))
    .limit(1);

  if (!event) {
    return null;
  }

  return {
    trackingId: event.trackingId,
    recipientEmail: event.recipientEmail,
    subject: event.subject,
    sentAt: event.sentAt,
    opened: event.opened,
    openCount: event.openCount || 0,
    firstOpenedAt: event.firstOpenedAt,
    lastOpenedAt: event.lastOpenedAt,
    clickCount: event.clickCount || 0,
    firstClickedAt: event.firstClickedAt,
    lastClickedAt: event.lastClickedAt,
    delivered: event.delivered,
    deliveredAt: event.deliveredAt,
    bounced: event.bounced,
    bouncedAt: event.bouncedAt,
    bounceReason: event.bounceReason,
    device: event.device,
    location: event.location,
  };
}
