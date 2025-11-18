'use client';

import { Repeat, AlertTriangle, Clock, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CalendarEvent,
  getEventColorClass,
  formatEventTime,
  parseRecurrenceRule,
  calculateEventStacking,
  isEventHappeningNow,
} from '@/lib/calendar/calendar-utils';

// Utility to strip HTML tags and decode HTML entities
function sanitizeEventText(text: string | undefined | null): string {
  if (!text) return '';

  // First, decode HTML entities
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const decoded = doc.documentElement.textContent || '';

  // Remove any remaining HTML tags
  return decoded.replace(/<[^>]*>/g, '').trim();
}

interface EventCardProps {
  event: CalendarEvent;
  allEvents?: CalendarEvent[];
  onClick?: (event: CalendarEvent) => void;
  showConflicts?: boolean;
  showTime?: boolean;
  className?: string;
}

export function EventCard({
  event,
  allEvents = [],
  onClick,
  showConflicts = true,
  showTime = true,
  className,
}: EventCardProps) {
  const { conflicts, column, totalColumns } = calculateEventStacking(event, allEvents);
  const hasConflicts = conflicts.length > 0;
  const isHappeningNow = isEventHappeningNow(event);
  const colorClass = getEventColorClass(event);

  // Calculate width and position for stacking
  const width = `${100 / totalColumns}%`;
  const left = `${(column * 100) / totalColumns}%`;

  return (
    <div
      onClick={() => onClick?.(event)}
      className={cn(
        'group relative rounded-lg border-l-4 p-2 cursor-pointer transition-all',
        'hover:shadow-md hover:scale-[1.02]',
        colorClass,
        isHappeningNow && 'ring-2 ring-primary ring-offset-2',
        className
      )}
      style={{
        width: totalColumns > 1 ? width : '100%',
        marginLeft: totalColumns > 1 ? left : '0',
      }}
    >
      {/* Event Title */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{sanitizeEventText(event.title)}</h4>

          {/* Time */}
          {showTime && (
            <div className="flex items-center gap-1 mt-1 text-xs opacity-75">
              <Clock className="h-3 w-3" />
              <span>{formatEventTime(event)}</span>
            </div>
          )}
        </div>

        {/* Indicators */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {/* Recurring Indicator */}
          {event.isRecurring && (
            <Badge
              variant="secondary"
              className="h-5 w-5 p-0 flex items-center justify-center"
              title={`Repeats ${parseRecurrenceRule(event.recurrenceRule || null)}`}
            >
              <Repeat className="h-3 w-3" />
            </Badge>
          )}

          {/* Conflict Warning */}
          {showConflicts && hasConflicts && (
            <Badge
              variant="destructive"
              className="h-5 w-5 p-0 flex items-center justify-center"
              title={`Conflicts with ${conflicts.length} other event${conflicts.length > 1 ? 's' : ''}`}
            >
              <AlertTriangle className="h-3 w-3" />
            </Badge>
          )}

          {/* Happening Now */}
          {isHappeningNow && (
            <Badge
              variant="default"
              className="h-5 px-2 text-[10px] font-semibold animate-pulse"
            >
              NOW
            </Badge>
          )}
        </div>
      </div>

      {/* Additional Details (shown on hover) */}
      <div className="mt-2 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {event.location && (
          <div className="flex items-center gap-1 text-xs opacity-75">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{sanitizeEventText(event.location)}</span>
          </div>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-1 text-xs opacity-75">
            <Users className="h-3 w-3" />
            <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Conflict Details (shown on hover) */}
      {showConflicts && hasConflicts && (
        <div className="mt-2 p-2 bg-destructive/10 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="font-semibold text-destructive mb-1">
            Conflicts with:
          </p>
          <ul className="space-y-0.5">
            {conflicts.slice(0, 2).map(conflictEvent => (
              <li key={conflictEvent.id} className="truncate">
                • {sanitizeEventText(conflictEvent.title)}
              </li>
            ))}
            {conflicts.length > 2 && (
              <li className="text-muted-foreground">
                +{conflicts.length - 2} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
