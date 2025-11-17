import { parseISO } from 'date-fns';

/**
 * Parse event start time from Nylas v3 event format
 * Nylas v3 events have a 'when' object with different formats:
 * - when.startTime: Unix timestamp (seconds)
 * - when.date: ISO date string (for all-day events)
 * - startTime: Legacy ISO string format
 */
export function parseEventStartTime(event: any): Date | null {
  try {
    if (event.when?.startTime) {
      return new Date(event.when.startTime * 1000);
    } else if (event.when?.date) {
      return new Date(event.when.date);
    } else if (event.startTime) {
      return parseISO(event.startTime);
    }
    return null;
  } catch (err) {
    console.error('Error parsing event start time:', err, event);
    return null;
  }
}

/**
 * Parse event end time from Nylas v3 event format
 */
export function parseEventEndTime(event: any): Date | null {
  try {
    if (event.when?.endTime) {
      return new Date(event.when.endTime * 1000);
    } else if (event.when?.date) {
      // All-day events: end date is the same as start date
      return new Date(event.when.date);
    } else if (event.endTime) {
      return parseISO(event.endTime);
    }
    return null;
  } catch (err) {
    console.error('Error parsing event end time:', err, event);
    return null;
  }
}

/**
 * Get event title from Nylas v3 event format
 */
export function getEventTitle(event: any): string {
  return event.title || event.summary || 'Untitled Event';
}

/**
 * Check if event is all-day
 */
export function isAllDayEvent(event: any): boolean {
  return !!event.when?.date || event.allDay === true;
}
