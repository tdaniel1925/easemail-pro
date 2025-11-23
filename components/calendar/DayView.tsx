/**
 * Day View Component
 * Displays calendar in single-day format with detailed time slots
 */

'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay } from 'date-fns';
import { parseEventStartTime, parseEventEndTime, getEventTitle } from '@/lib/calendar/event-utils';
import { buildConflictMap, type CalendarEvent } from '@/lib/calendar/calendar-utils';

interface DayViewProps {
  events: any[];
  onEventClick: (event: any) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function DayView({
  events,
  onEventClick,
  onTimeSlotClick,
  currentDate,
  onDateChange,
}: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // ✅ Build conflict map for all events (memoized for performance)
  const conflictMap = useMemo(() => {
    return buildConflictMap(events as CalendarEvent[]);
  }, [events]);

  const previousDay = () => {
    onDateChange(addDays(currentDate, -1));
  };

  const nextDay = () => {
    onDateChange(addDays(currentDate, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  const isToday = isSameDay(currentDate, new Date());

  // Filter events for current day
  const dayEvents = events.filter(event => {
    const eventStart = parseEventStartTime(event);
    return eventStart && isSameDay(eventStart, currentDate);
  });

  // Calculate event position and height
  const getEventStyle = (event: any) => {
    const start = parseEventStartTime(event);
    const end = parseEventEndTime(event);

    if (!start || !end) {
      return { top: '0px', height: '80px' };
    }

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = endHour - startHour;

    return {
      top: `${startHour * 80}px`, // 80px per hour for more space
      height: `${Math.max(duration * 80, 40)}px`, // Minimum 40px
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className={cn(
          "text-lg font-semibold",
          isToday && "text-primary"
        )}>
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </h2>
      </div>

      {/* Day grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Time labels */}
          <div className="w-20 flex-shrink-0 border-r">
            {hours.map(hour => (
              <div key={hour} className="h-[80px] pr-2 text-right text-sm text-muted-foreground border-t">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Time slots and events */}
          <div className="flex-1 relative">
            {hours.map(hour => (
              <div
                key={hour}
                onDoubleClick={() => onTimeSlotClick(currentDate, hour)}
                className="h-[80px] border-t hover:bg-accent/50 cursor-pointer transition-colors"
                title="Double-click to create event"
              />
            ))}

            {/* Events */}
            <div className="absolute inset-0 pointer-events-none px-2">
              {dayEvents.map(event => {
                const style = getEventStyle(event);
                const start = parseEventStartTime(event);
                const end = parseEventEndTime(event);
                const conflicts = conflictMap.get(event.id) || [];
                const hasConflict = conflicts.length > 0;

                if (!start || !end) return null;

                const hexColor = event.hexColor || '#3b82f6';
                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    style={{
                      ...style,
                      backgroundColor: hasConflict ? '#fee2e2' : hexColor,
                      borderLeft: `4px solid ${hasConflict ? '#ef4444' : hexColor}`,
                      filter: hasConflict ? 'none' : 'brightness(0.95)',
                    }}
                    className={cn(
                      "absolute left-2 right-2 rounded-lg p-3 pointer-events-auto cursor-pointer shadow-md hover:shadow-lg transition-shadow",
                      hasConflict ? 'text-red-900 ring-2 ring-red-400' : 'text-white'
                    )}
                    title={hasConflict ? `Conflicts with ${conflicts.length} event(s)` : undefined}
                  >
                    <div className="font-semibold flex items-center gap-2">
                      {hasConflict && (
                        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <span>{event.title}</span>
                    </div>
                    <div className="text-sm opacity-90">
                      {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                    </div>
                    <div className="text-sm opacity-90 mt-1">
                      📍 {event.location && event.location.trim() ? event.location : 'No location added'}
                    </div>
                    <div className="text-sm opacity-90 mt-1 line-clamp-2">
                      {event.description && event.description.trim() ? event.description : 'No description added'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

