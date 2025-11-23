/**
 * Calendar Event RSVP API
 * GET /api/calendar/events/[eventId]/rsvp
 * Handle RSVP responses (accept/decline/tentative) from calendar invitation recipients
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { calendarEvents, emailAccounts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateRSVPToken } from '@/lib/calendar/rsvp-tokens';
import { createCalendarSyncService } from '@/lib/services/calendar-sync-service';
import { sendEmail } from '@/lib/email/send';
import { ratelimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Generate confirmation HTML page
 */
function generateConfirmationPage(
  eventTitle: string,
  organizerName: string,
  response: 'accepted' | 'declined' | 'tentative',
  attendeeEmail: string
): string {
  const responseText = {
    accepted: { title: 'Invitation Accepted', message: 'You have accepted this invitation.', icon: '✅', color: '#10B981' },
    declined: { title: 'Invitation Declined', message: 'You have declined this invitation.', icon: '❌', color: '#EF4444' },
    tentative: { title: 'Invitation Tentative', message: 'You have marked this invitation as tentative.', icon: '❓', color: '#F59E0B' },
  };

  const responseInfo = responseText[response];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${responseInfo.title} - ${eventTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 {
      color: #1a1d23;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .message {
      color: #5c616b;
      font-size: 16px;
      margin-bottom: 32px;
      line-height: 1.6;
    }
    .event-title {
      background: #f5f6f8;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .event-title strong {
      color: #1a1d23;
      font-size: 18px;
    }
    .organizer {
      color: #5c616b;
      font-size: 14px;
      margin-bottom: 32px;
    }
    .close-button {
      background: ${responseInfo.color};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 32px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .close-button:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${responseInfo.icon}</div>
    <h1>${responseInfo.title}</h1>
    <p class="message">${responseInfo.message}</p>
    
    <div class="event-title">
      <strong>${eventTitle}</strong>
    </div>
    
    <p class="organizer">
      Organizer: <strong>${organizerName}</strong>
    </p>
    
    <button class="close-button" onclick="window.close()">Close</button>
  </div>
</body>
</html>
  `.trim();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const response = searchParams.get('response') as 'accepted' | 'declined' | 'tentative' | null;

    // Rate limiting: 5 RSVP changes per email per hour
    if (email) {
      const identifier = `rsvp:${params.eventId}:${email.toLowerCase()}`;
      const { success, limit, remaining, reset } = await ratelimit.limit(identifier);

      if (!success) {
        return new NextResponse(
          generateConfirmationPage(
            'Rate Limit Exceeded',
            'System',
            'declined',
            email
          ).replace('Invitation Declined', 'Too Many Requests').replace('You have declined this invitation.', `You've made too many RSVP changes. Please try again in ${Math.ceil((reset - Date.now()) / 60000)} minutes.`),
          {
            status: 429,
            headers: {
              'Content-Type': 'text/html',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(reset).toISOString(),
            }
          }
        );
      }
    }

    // Validate required parameters
    if (!token || !email || !response) {
      return new NextResponse(
        generateConfirmationPage(
          'Invalid Request',
          'System',
          'declined',
          email || 'unknown'
        ).replace('Invitation Declined', 'Invalid Request').replace('You have declined this invitation.', 'Missing required parameters. Please use the RSVP links from your invitation email.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Validate response value
    if (!['accepted', 'declined', 'tentative'].includes(response)) {
      return new NextResponse(
        generateConfirmationPage(
          'Invalid Response',
          'System',
          'declined',
          email
        ).replace('Invitation Declined', 'Invalid Response').replace('You have declined this invitation.', 'Invalid response type. Please use the RSVP links from your invitation email.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Validate token
    const tokenData = validateRSVPToken(token);
    if (!tokenData || !tokenData.valid) {
      return new NextResponse(
        generateConfirmationPage(
          'Invalid Token',
          'System',
          'declined',
          email
        ).replace('Invitation Declined', 'Invalid Token').replace('You have declined this invitation.', 'Invalid or expired RSVP token. Please request a new invitation.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Verify event ID matches
    if (tokenData.eventId !== params.eventId) {
      return new NextResponse(
        generateConfirmationPage(
          'Invalid Event',
          'System',
          'declined',
          email
        ).replace('Invitation Declined', 'Invalid Event').replace('You have declined this invitation.', 'Event ID mismatch. Please use the RSVP links from your invitation email.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Verify email matches
    if (tokenData.attendeeEmail.toLowerCase() !== email.toLowerCase()) {
      return new NextResponse(
        generateConfirmationPage(
          'Email Mismatch',
          'System',
          'declined',
          email
        ).replace('Invitation Declined', 'Email Mismatch').replace('You have declined this invitation.', 'Email address does not match the invitation. Please use the RSVP links from your invitation email.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get event
    const event = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, params.eventId),
    });

    if (!event) {
      return new NextResponse(
        generateConfirmationPage(
          'Event Not Found',
          'System',
          'declined',
          email
        ).replace('Invitation Declined', 'Event Not Found').replace('You have declined this invitation.', 'The event could not be found. It may have been deleted.'),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get organizer info
    const organizer = await db.query.users.findFirst({
      where: eq(users.id, event.userId),
    });

    const organizerName = organizer?.fullName || organizer?.email || event.organizerEmail || 'Event Organizer';
    const organizerEmail = event.organizerEmail || organizer?.email || '';

    // Update attendee status
    type AttendeeStatus = 'pending' | 'accepted' | 'declined' | 'maybe';
    type Attendee = { email: string; name?: string; status: AttendeeStatus };

    const attendees: Attendee[] = ((event.attendees as Array<{ email: string; name?: string; status?: string }>) || []).map(a => ({
      email: a.email,
      name: a.name,
      status: (a.status && ['pending', 'accepted', 'declined', 'maybe'].includes(a.status))
        ? a.status as AttendeeStatus
        : 'pending' as AttendeeStatus,
    }));

    const attendeeIndex = attendees.findIndex(
      a => a.email.toLowerCase() === email.toLowerCase()
    );

    // Track old status for change detection
    const oldStatus = attendeeIndex !== -1 ? attendees[attendeeIndex].status : 'pending';

    if (attendeeIndex === -1) {
      return new NextResponse(
        generateConfirmationPage(
          'Not Invited',
          organizerName,
          'declined',
          email
        ).replace('Invitation Declined', 'Not Invited').replace('You have declined this invitation.', 'Your email address was not found in the attendee list for this event.'),
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Map response to attendee status (tentative -> maybe)
    const statusMap: Record<'accepted' | 'declined' | 'tentative', AttendeeStatus> = {
      accepted: 'accepted',
      declined: 'declined',
      tentative: 'maybe',
    };

    const newStatus: AttendeeStatus = statusMap[response];

    // Update attendee status - ensure all attendees have a valid status
    const updatedAttendees: Attendee[] = attendees.map((attendee, index) => {
      if (index === attendeeIndex) {
        return {
          email: attendee.email,
          name: attendee.name,
          status: newStatus,
        };
      }
      return {
        email: attendee.email,
        name: attendee.name,
        status: attendee.status,
      };
    });

    // Update event in database with RSVP history
    const rsvpHistory = (event.metadata as any)?.rsvpHistory || [];
    rsvpHistory.push({
      email,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
    });

    await db.update(calendarEvents)
      .set({
        attendees: updatedAttendees,
        updatedAt: new Date(),
        metadata: {
          ...(event.metadata as any || {}),
          rsvpHistory,
        },
      })
      .where(eq(calendarEvents.id, params.eventId));

    // Sync to external calendar if event is synced
    const remoteEventId = event.googleEventId || event.microsoftEventId;
    const provider = event.googleEventId ? 'google' : event.microsoftEventId ? 'microsoft' : null;
    
    if (remoteEventId && provider) {
      try {
        // Get user's calendar account
        const accounts = await db.query.emailAccounts.findMany({
          where: eq(emailAccounts.userId, event.userId),
        });

        const syncAccount = accounts.find(acc =>
          acc.nylasGrantId &&
          acc.provider === provider &&
          acc.nylasScopes?.some((s: string) => s.toLowerCase().includes('calendar'))
        );

        if (syncAccount && syncAccount.nylasGrantId) {
          const calendarId = provider === 'google' 
            ? event.googleCalendarId 
            : event.microsoftCalendarId;

          const syncService = createCalendarSyncService({
            accountId: syncAccount.id,
            userId: event.userId,
            grantId: syncAccount.nylasGrantId,
            provider: provider as 'google' | 'microsoft',
            calendarId: calendarId || undefined,
          });

          // Update event with new attendee status
          const updatedEvent = {
            ...event,
            attendees: updatedAttendees,
          };

          await syncService.updateEvent(remoteEventId, updatedEvent);

          console.log(`✅ RSVP synced to ${provider} calendar`);
        }
      } catch (syncError: any) {
        console.error('⚠️ Failed to sync RSVP to external calendar:', syncError);
        // Don't fail the RSVP if sync fails - the local update is more important
      }
    }

    // Send notification email to organizer
    if (organizerEmail && process.env.RESEND_API_KEY) {
      try {
        // Detect if this is a status change (not first response)
        const isStatusChange = oldStatus !== 'pending' && oldStatus !== newStatus;

        if (isStatusChange) {
          // Send RSVP change notification
          const { getRSVPChangeNotificationTemplate, getRSVPChangeNotificationSubject } = await import('@/lib/email/templates/rsvp-change-notification');

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
          const eventDetailsUrl = `${baseUrl}/calendar?event=${params.eventId}`;

          const emailHtml = getRSVPChangeNotificationTemplate({
            eventTitle: event.title,
            eventStartTime: event.startTime,
            eventLocation: event.location || undefined,
            attendeeEmail: email,
            attendeeName: attendees[attendeeIndex]?.name,
            oldStatus,
            newStatus,
            organizerName,
            eventDetailsUrl,
          });

          const subject = getRSVPChangeNotificationSubject({
            eventTitle: event.title,
            attendeeEmail: email,
            newStatus,
          });

          await sendEmail({
            to: organizerEmail,
            subject,
            html: emailHtml,
          });

          console.log(`✅ RSVP change notification sent to ${organizerEmail}`);
        } else {
          // Send initial RSVP response notification (simple format)
          const responseEmoji = {
            accepted: '✅',
            declined: '❌',
            tentative: '❓',
          };

          const responseText = {
            accepted: 'accepted',
            declined: 'declined',
            tentative: 'marked as tentative',
          };

          await sendEmail({
            to: organizerEmail,
            subject: `${responseEmoji[response]} ${email} ${responseText[response]} your invitation: ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>RSVP Response</h2>
                <p><strong>${email}</strong> has ${responseText[response]} your invitation to:</p>
                <div style="background: #f5f6f8; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0;">${event.title}</h3>
                  ${event.startTime ? `<p style="margin: 8px 0 0; color: #666;">${new Date(event.startTime).toLocaleString()}</p>` : ''}
                </div>
                <p style="color: #666; font-size: 14px;">
                  You can view all RSVP responses in your calendar.
                </p>
              </div>
            `,
          });

          console.log(`✅ Initial RSVP notification sent to ${organizerEmail}`);
        }
      } catch (emailError: any) {
        console.error('⚠️ Failed to send RSVP notification email:', emailError);
        // Don't fail the RSVP if notification fails
      }
    }

    // Return success confirmation page
    return new NextResponse(
      generateConfirmationPage(event.title, organizerName, response, email),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error: any) {
    console.error('❌ RSVP error:', error);
    return new NextResponse(
      generateConfirmationPage(
        'Error',
        'System',
        'declined',
        'unknown'
      ).replace('Invitation Declined', 'Error').replace('You have declined this invitation.', 'An error occurred while processing your RSVP. Please try again later.'),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

