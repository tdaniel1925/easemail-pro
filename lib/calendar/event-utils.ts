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
    // Nylas v3 format with Unix timestamp
    if (event.when?.startTime) {
      return new Date(event.when.startTime * 1000);
    }
    // All-day event format
    else if (event.when?.date) {
      return new Date(event.when.date);
    }
    // Legacy ISO string format or local database format
    else if (event.startTime) {
      return parseISO(event.startTime);
    }
    // Try start_time (Cal.com format)
    else if (event.start_time) {
      return parseISO(event.start_time);
    }

    console.warn('[Event Utils] Could not parse start time for event:', event.id, event);
    return null;
  } catch (err) {
    console.error('[Event Utils] Error parsing event start time:', err, event);
    return null;
  }
}

/**
 * Parse event end time from Nylas v3 event format
 */
export function parseEventEndTime(event: any): Date | null {
  try {
    // Nylas v3 format with Unix timestamp
    if (event.when?.endTime) {
      return new Date(event.when.endTime * 1000);
    }
    // All-day events: end date is the same as start date
    else if (event.when?.date) {
      const endOfDay = new Date(event.when.date);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    }
    // Legacy ISO string format or local database format
    else if (event.endTime) {
      return parseISO(event.endTime);
    }
    // Try end_time (Cal.com format)
    else if (event.end_time) {
      return parseISO(event.end_time);
    }

    console.warn('[Event Utils] Could not parse end time for event:', event.id, event);
    return null;
  } catch (err) {
    console.error('[Event Utils] Error parsing event end time:', err, event);
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

/**
 * Transform Nylas v3 event format to calendar component format
 * This normalizes the event data structure so components can work with it consistently
 */
export function transformNylasEvent(event: any): any {
  const startTime = parseEventStartTime(event);
  const endTime = parseEventEndTime(event);

  if (!startTime || !endTime) {
    console.warn('[Event Utils] Could not transform event - missing valid times:', event.id);
    return null;
  }

  return {
    ...event,
    // Add top-level startTime and endTime for calendar components
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    // Preserve original when data
    when: event.when,
    // Normalize title
    title: getEventTitle(event),
    // Normalize all-day flag
    allDay: isAllDayEvent(event),
    // Calendar metadata (already enriched from API)
    calendarName: event.calendarName,
    calendarIsPrimary: event.calendarIsPrimary,
    color: event.color || 'blue',
    hexColor: event.hexColor,
  };
}
