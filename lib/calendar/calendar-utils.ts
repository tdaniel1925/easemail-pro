/**
 * Calendar Utility Functions
 * Event conflict detection, recurring event helpers, and more
 */

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  allDay?: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  calendarType?: string;
  color?: string;
  hexColor?: string;
  calendarId?: string;
  calendarName?: string;
  calendarIsPrimary?: boolean;
  status?: string;
  location?: string;
  attendees?: any[];
}

/**
 * Check if two events overlap/conflict
 */
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  try {
    const start1 = new Date(event1.startTime);
    const end1 = new Date(event1.endTime);
    const start2 = new Date(event2.startTime);
    const end2 = new Date(event2.endTime);

    // Validate dates
    if (isNaN(start1.getTime()) || isNaN(end1.getTime()) || isNaN(start2.getTime()) || isNaN(end2.getTime())) {
      return false;
    }

    // Events overlap if one starts before the other ends
    return start1 < end2 && start2 < end1;
  } catch (err) {
    console.error('[Calendar Utils] Error checking event overlap:', err);
    return false;
  }
}

/**
 * Find all events that conflict with a given event
 */
export function findConflictingEvents(
  targetEvent: CalendarEvent,
  allEvents: CalendarEvent[]
): CalendarEvent[] {
  return allEvents.filter(event => {
    // Don't compare event with itself
    if (event.id === targetEvent.id) return false;

    // Only check confirmed events
    if (event.status === 'cancelled') return false;
    if (targetEvent.status === 'cancelled') return false;

    return eventsOverlap(targetEvent, event);
  });
}

/**
 * Check if an event is happening right now
 */
export function isEventHappeningNow(event: CalendarEvent): boolean {
  try {
    const now = new Date();
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }

    return now >= start && now <= end;
  } catch (err) {
    console.error('[Calendar Utils] Error checking if event is happening now:', err);
    return false;
  }
}

/**
 * Get visual stacking position for overlapping events
 * Returns { column, totalColumns } for CSS positioning
 */
export function calculateEventStacking(
  targetEvent: CalendarEvent,
  allEvents: CalendarEvent[]
): { column: number; totalColumns: number; conflicts: CalendarEvent[] } {
  const conflicts = findConflictingEvents(targetEvent, allEvents);

  if (conflicts.length === 0) {
    return { column: 0, totalColumns: 1, conflicts: [] };
  }

  // Sort all conflicting events (including target) by start time, then by ID for consistency
  const allConflicting = [targetEvent, ...conflicts].sort((a, b) => {
    const timeDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  const column = allConflicting.findIndex(e => e.id === targetEvent.id);
  const totalColumns = allConflicting.length;

  return { column, totalColumns, conflicts };
}

/**
 * Get color class based on calendar type and custom color
 */
export function getEventColorClass(event: CalendarEvent): string {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300',
    green: 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-300',
    red: 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-300',
    purple: 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-purple-300',
    orange: 'bg-orange-500/10 border-orange-500 text-orange-700 dark:text-orange-300',
    pink: 'bg-pink-500/10 border-pink-500 text-pink-700 dark:text-pink-300',
    yellow: 'bg-yellow-500/10 border-yellow-500 text-yellow-700 dark:text-yellow-300',
    gray: 'bg-gray-500/10 border-gray-500 text-gray-700 dark:text-gray-300',
  };

  return colorMap[event.color || 'blue'] || colorMap.blue;
}

/**
 * Get calendar type display info
 */
export function getCalendarTypeInfo(type: string): { label: string; icon: string; color: string } {
  const typeMap: Record<string, { label: string; icon: string; color: string }> = {
    personal: { label: 'Personal', icon: '👤', color: 'blue' },
    work: { label: 'Work', icon: '💼', color: 'purple' },
    family: { label: 'Family', icon: '👨‍👩‍👧‍👦', color: 'green' },
    holiday: { label: 'Holiday', icon: '🎉', color: 'red' },
    birthday: { label: 'Birthday', icon: '🎂', color: 'pink' },
    meeting: { label: 'Meeting', icon: '🤝', color: 'orange' },
    task: { label: 'Task', icon: '✅', color: 'gray' },
  };

  return typeMap[type] || { label: type, icon: '📅', color: 'blue' };
}

/**
 * Parse recurrence rule to human-readable string
 */
export function parseRecurrenceRule(rule: string | null): string {
  if (!rule) return '';

  // Simple RRULE parsing (can be enhanced)
  if (rule.includes('FREQ=DAILY')) return 'Daily';
  if (rule.includes('FREQ=WEEKLY')) return 'Weekly';
  if (rule.includes('FREQ=MONTHLY')) return 'Monthly';
  if (rule.includes('FREQ=YEARLY')) return 'Yearly';

  return 'Repeating';
}

/**
 * Group events by day for agenda view
 */
export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();

  events.forEach(event => {
    try {
      const date = new Date(event.startTime);

      // Validate date
      if (isNaN(date.getTime())) {
        console.warn('[Calendar Utils] Invalid date for event:', event.id);
        return;
      }

      const dateKey = date.toISOString().split('T')[0];

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(event);
    } catch (err) {
      console.error('[Calendar Utils] Error grouping event by day:', err, event);
    }
  });

  // Sort events within each day
  grouped.forEach((dayEvents, key) => {
    dayEvents.sort((a, b) => {
      try {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      } catch (err) {
        return 0;
      }
    });
  });

  return grouped;
}

/**
 * Format event time range
 */
export function formatEventTime(event: CalendarEvent): string {
  try {
    if (event.allDay) {
      return 'All day';
    }

    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid time';
    }

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

    return `${formatTime(start)} - ${formatTime(end)}`;
  } catch (err) {
    console.error('[Calendar Utils] Error formatting event time:', err, event);
    return 'Invalid time';
  }
}

/**
 * Check if event spans multiple days
 */
export function isMultiDayEvent(event: CalendarEvent): boolean {
  try {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }

    return start.toDateString() !== end.toDateString();
  } catch (err) {
    console.error('[Calendar Utils] Error checking if event is multi-day:', err);
    return false;
  }
}

/**
 * Build a conflict map for all events
 * Returns a Map where key is event ID and value is array of conflicting events
 * This is more efficient than calling findConflictingEvents for each event individually
 */
export function buildConflictMap(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const conflictMap = new Map<string, CalendarEvent[]>();

  // Initialize map with empty arrays
  events.forEach(event => {
    conflictMap.set(event.id, []);
  });

  // Compare each event with every other event
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const event1 = events[i];
      const event2 = events[j];

      // Skip cancelled events
      if (event1.status === 'cancelled' || event2.status === 'cancelled') {
        continue;
      }

      // Check if they overlap
      if (eventsOverlap(event1, event2)) {
        // Add each event to the other's conflict list
        conflictMap.get(event1.id)?.push(event2);
        conflictMap.get(event2.id)?.push(event1);
      }
    }
  }

  return conflictMap;
}
