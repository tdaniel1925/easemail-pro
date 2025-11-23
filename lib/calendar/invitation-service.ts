/**
 * Calendar Invitation Service
 * Sends calendar invitation emails via Resend with iCalendar attachments
 */

import { sendEmail } from '@/lib/email/send';
import { getCalendarInvitationTemplate, getCalendarInvitationSubject } from '@/lib/email/templates/calendar-invitation';
import { generateICalendarFile, generateEventUID } from './ical-generator';
import { generateRSVPLinks } from './rsvp-tokens';
import { Resend } from 'resend';

// Lazy-initialize Resend only when needed
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

interface EventData {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  timezone?: string | null;
  organizerEmail?: string | null;
  attendees?: Array<{
    email: string;
    name?: string;
    status?: 'accepted' | 'declined' | 'tentative' | 'pending';
  }> | null;
  recurrenceRule?: string | null;
}

interface OrganizerData {
  name: string;
  email: string;
}

interface InvitationOptions {
  customMessage?: string;
  subjectOverride?: string;
}

/**
 * Send calendar invitation emails to all attendees
 */
export async function sendCalendarInvitations(
  event: EventData,
  organizer: OrganizerData,
  options?: InvitationOptions
): Promise<{ success: boolean; sent: number; errors: number }> {
  if (!event.attendees || event.attendees.length === 0) {
    return { success: true, sent: 0, errors: 0 };
  }

  // Don't send invitation to organizer
  const attendeesToInvite = event.attendees.filter(
    attendee => attendee.email.toLowerCase() !== organizer.email.toLowerCase()
  );

  if (attendeesToInvite.length === 0) {
    return { success: true, sent: 0, errors: 0 };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const eventUID = generateEventUID(event.id);
  
  // Generate iCalendar file
  const icalContent = generateICalendarFile({
    uid: eventUID,
    title: event.title,
    description: event.description || undefined,
    location: event.location || undefined,
    startTime: event.startTime,
    endTime: event.endTime,
    allDay: event.allDay,
    timezone: event.timezone || undefined,
    organizerEmail: organizer.email,
    organizerName: organizer.name,
    attendees: event.attendees,
    recurrenceRule: event.recurrenceRule || undefined,
  });

  let sent = 0;
  let errors = 0;

  // Check if RESEND_API_KEY is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured - invitations not sent');
    return { success: false, sent: 0, errors: attendeesToInvite.length };
  }

  // Parallel sending with concurrency limit (5 emails at a time)
  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(5);

  const sendPromises = attendeesToInvite.map(attendee =>
    limit(async () => {
      try {
        // Generate RSVP links for this attendee
        const rsvpLinks = generateRSVPLinks(event.id, attendee.email, baseUrl);

        // Generate email HTML
        const emailHtml = getCalendarInvitationTemplate({
          eventTitle: event.title,
          eventDescription: event.description || undefined,
          eventLocation: event.location || undefined,
          startDate: event.startTime,
          endDate: event.endTime,
          allDay: event.allDay,
          organizerName: organizer.name,
          organizerEmail: organizer.email,
          attendeeEmail: attendee.email,
          attendeeName: attendee.name,
          rsvpAcceptLink: rsvpLinks.accept,
          rsvpDeclineLink: rsvpLinks.decline,
          rsvpTentativeLink: rsvpLinks.tentative,
          timezone: event.timezone || undefined,
          customMessage: options?.customMessage,
        });

        // Send email with attachment via Resend
        const resend = getResendClient();

        const { data, error } = await resend.emails.send({
          from: `${process.env.EMAIL_FROM_NAME || 'EaseMail'} <${process.env.EMAIL_FROM || 'noreply@easemail.app'}>`,
          to: attendee.email,
          subject: options?.subjectOverride || getCalendarInvitationSubject({
            eventTitle: event.title,
          }),
          html: emailHtml,
          attachments: [
            {
              filename: 'invite.ics',
              content: Buffer.from(icalContent).toString('base64'),
            },
          ],
          replyTo: organizer.email,
        });

        if (error) {
          console.error(`❌ Failed to send invitation to ${attendee.email}:`, error);
          return { success: false, email: attendee.email, error };
        } else {
          console.log(`✅ Invitation sent to ${attendee.email}:`, data?.id);
          return { success: true, email: attendee.email, messageId: data?.id };
        }
      } catch (error: any) {
        console.error(`❌ Error sending invitation to ${attendee.email}:`, error);
        return { success: false, email: attendee.email, error };
      }
    })
  );

  // Wait for all emails to be sent
  const results = await Promise.all(sendPromises);

  // Count successes and failures
  results.forEach(result => {
    if (result.success) {
      sent++;
    } else {
      errors++;
    }
  });

  return {
    success: errors === 0,
    sent,
    errors,
  };
}

