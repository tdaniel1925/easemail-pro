/**
 * Event Change Detection and Update Notification Service
 * Detects meaningful changes in calendar events and sends notifications to attendees
 */

import { sendEmail } from '@/lib/email/send';
import { getCalendarUpdateNotificationTemplate, getCalendarUpdateNotificationSubject } from '@/lib/email/templates/calendar-update-notification';
import { generateICalendarFile, generateEventUID } from './ical-generator';
import { generateRSVPLinks } from './rsvp-tokens';

interface EventChange {
  field: string;
  oldValue: string;
  newValue: string;
  label: string;
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

/**
 * Detect changes between old and new event
 */
export function detectEventChanges(oldEvent: EventData, newEvent: EventData): {
  hasChanges: boolean;
  requiresReconfirmation: boolean;
  changes: EventChange[];
} {
  const changes: EventChange[] = [];
  let requiresReconfirmation = false;

  // Title change
  if (oldEvent.title !== newEvent.title) {
    changes.push({
      field: 'title',
      oldValue: oldEvent.title,
      newValue: newEvent.title,
      label: 'Event Title',
    });
  }

  // Start time change (significant)
  if (oldEvent.startTime.getTime() !== newEvent.startTime.getTime()) {
    changes.push({
      field: 'startTime',
      oldValue: oldEvent.startTime.toLocaleString(),
      newValue: newEvent.startTime.toLocaleString(),
      label: 'Start Time',
    });
    requiresReconfirmation = true;
  }

  // End time change
  if (oldEvent.endTime.getTime() !== newEvent.endTime.getTime()) {
    changes.push({
      field: 'endTime',
      oldValue: oldEvent.endTime.toLocaleString(),
      newValue: newEvent.endTime.toLocaleString(),
      label: 'End Time',
    });
  }

  // Location change (significant)
  if (oldEvent.location !== newEvent.location) {
    changes.push({
      field: 'location',
      oldValue: oldEvent.location || 'Not specified',
      newValue: newEvent.location || 'Not specified',
      label: 'Location',
    });
    requiresReconfirmation = true;
  }

  // Description change
  if (oldEvent.description !== newEvent.description) {
    changes.push({
      field: 'description',
      oldValue: oldEvent.description ? (oldEvent.description.length > 50 ? oldEvent.description.substring(0, 50) + '...' : oldEvent.description) : 'Not specified',
      newValue: newEvent.description ? (newEvent.description.length > 50 ? newEvent.description.substring(0, 50) + '...' : newEvent.description) : 'Not specified',
      label: 'Description',
    });
  }

  // All-day status change
  if (oldEvent.allDay !== newEvent.allDay) {
    changes.push({
      field: 'allDay',
      oldValue: oldEvent.allDay ? 'All day' : 'Timed event',
      newValue: newEvent.allDay ? 'All day' : 'Timed event',
      label: 'Event Type',
    });
    requiresReconfirmation = true;
  }

  // Timezone change
  if (oldEvent.timezone !== newEvent.timezone) {
    changes.push({
      field: 'timezone',
      oldValue: oldEvent.timezone || 'UTC',
      newValue: newEvent.timezone || 'UTC',
      label: 'Timezone',
    });
  }

  return {
    hasChanges: changes.length > 0,
    requiresReconfirmation,
    changes,
  };
}

/**
 * Send event update notifications to all attendees
 */
export async function sendEventUpdateNotifications(
  event: EventData,
  organizer: OrganizerData,
  changes: EventChange[],
  requiresReconfirmation: boolean
): Promise<{ success: boolean; sent: number; errors: number }> {
  if (!event.attendees || event.attendees.length === 0 || changes.length === 0) {
    return { success: true, sent: 0, errors: 0 };
  }

  // Don't send update to organizer
  const attendeesToNotify = event.attendees.filter(
    attendee => attendee.email.toLowerCase() !== organizer.email.toLowerCase()
  );

  if (attendeesToNotify.length === 0) {
    return { success: true, sent: 0, errors: 0 };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  const eventUID = generateEventUID(event.id);

  // Generate updated iCalendar file with SEQUENCE incremented
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

  // Send update notification to each attendee
  for (const attendee of attendeesToNotify) {
    try {
      // Generate fresh RSVP links for this attendee
      const rsvpLinks = generateRSVPLinks(event.id, attendee.email, baseUrl);

      // Generate email HTML
      const emailHtml = getCalendarUpdateNotificationTemplate({
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
        changes,
        rsvpAcceptLink: rsvpLinks.accept,
        rsvpDeclineLink: rsvpLinks.decline,
        rsvpTentativeLink: rsvpLinks.tentative,
        timezone: event.timezone || undefined,
        requiresReconfirmation,
      });

      // Send email with updated attachment
      if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not configured - update notification not sent');
        errors++;
        continue;
      }

      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: `${process.env.EMAIL_FROM_NAME || 'EaseMail'} <${process.env.EMAIL_FROM || 'noreply@easemail.app'}>`,
        to: attendee.email,
        subject: getCalendarUpdateNotificationSubject({ eventTitle: event.title }),
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
        console.error(`❌ Failed to send update notification to ${attendee.email}:`, error);
        errors++;
      } else {
        console.log(`✅ Update notification sent to ${attendee.email}:`, data?.id);
        sent++;
      }
    } catch (error: any) {
      console.error(`❌ Error sending update notification to ${attendee.email}:`, error);
      errors++;
    }
  }

  return {
    success: errors === 0,
    sent,
    errors,
  };
}
