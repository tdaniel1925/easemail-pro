/**
 * iCalendar (.ics) File Generator
 * Generates RFC 5545 compliant iCalendar files for calendar invitations
 */

interface CalendarEventData {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  timezone?: string;
  organizerEmail: string;
  organizerName?: string;
  attendees: Array<{
    email: string;
    name?: string;
    status?: 'accepted' | 'declined' | 'tentative' | 'pending';
  }>;
  recurrenceRule?: string;
  url?: string;
}

/**
 * Escape text for iCalendar format
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Format date for iCalendar (UTC)
 */
function formatDate(date: Date, allDay: boolean): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  if (allDay) {
    return `${year}${month}${day}`;
  }
  
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Map attendee status to iCalendar PARTSTAT
 */
function mapAttendeeStatus(status?: string): string {
  switch (status) {
    case 'accepted':
      return 'ACCEPTED';
    case 'declined':
      return 'DECLINED';
    case 'tentative':
      return 'TENTATIVE';
    default:
      return 'NEEDS-ACTION';
  }
}

/**
 * Generate iCalendar file content
 */
export function generateICalendarFile(event: CalendarEventData): string {
  const lines: string[] = [];
  
  // Calendar header
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//EaseMail//Calendar//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:REQUEST');
  
  // Event
  lines.push('BEGIN:VEVENT');
  lines.push(`UID:${event.uid}`);
  lines.push(`DTSTAMP:${formatDate(new Date(), false)}`);
  
  // Start and end times
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(event.startTime, true)}`);
    // For all-day events, end date is exclusive (next day)
    const endDate = new Date(event.endTime);
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    lines.push(`DTEND;VALUE=DATE:${formatDate(endDate, true)}`);
  } else {
    // For timed events, use UTC or timezone
    if (event.timezone) {
      // Format date in local timezone for TZID
      const formatLocalDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}`;
      };
      lines.push(`DTSTART;TZID=${event.timezone}:${formatLocalDate(event.startTime)}`);
      lines.push(`DTEND;TZID=${event.timezone}:${formatLocalDate(event.endTime)}`);
    } else {
      lines.push(`DTSTART:${formatDate(event.startTime, false)}`);
      lines.push(`DTEND:${formatDate(event.endTime, false)}`);
    }
  }
  
  // Event details
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  
  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }
  
  // Organizer
  const organizerName = event.organizerName ? `CN=${escapeText(event.organizerName)}:` : '';
  lines.push(`ORGANIZER;${organizerName}mailto:${event.organizerEmail}`);
  
  // Attendees
  event.attendees.forEach(attendee => {
    const attendeeName = attendee.name ? `CN=${escapeText(attendee.name)};` : '';
    const status = mapAttendeeStatus(attendee.status);
    lines.push(`ATTENDEE;${attendeeName}RSVP=TRUE;PARTSTAT=${status}:mailto:${attendee.email}`);
  });
  
  // Recurrence
  if (event.recurrenceRule) {
    // Convert RRULE format to iCalendar format
    const rrule = event.recurrenceRule.startsWith('RRULE:') 
      ? event.recurrenceRule.substring(6)
      : event.recurrenceRule;
    lines.push(`RRULE:${rrule}`);
  }
  
  // URL if provided
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }
  
  // Status
  lines.push('STATUS:CONFIRMED');
  lines.push('SEQUENCE:0');
  
  // Event footer
  lines.push('END:VEVENT');
  
  // Calendar footer
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
}

/**
 * Generate unique UID for event
 */
export function generateEventUID(eventId: string): string {
  return `${eventId}@easemail.app`;
}

