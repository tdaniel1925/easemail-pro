/**
 * Week View Component
 * Displays calendar in week format with time slots
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { buildConflictMap, type CalendarEvent } from '@/lib/calendar/calendar-utils';

interface WeekViewProps {
  events: any[];
  onEventClick: (event: any) => void;
  onTimeSlotClick: (date: Date, hour: number) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export default function WeekView({
  events,
  onEventClick,
  onTimeSlotClick,
  currentDate,
  onDateChange,
}: WeekViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // ✅ Build conflict map for all events (memoized for performance)
  const conflictMap = useMemo(() => {
    return buildConflictMap(events as CalendarEvent[]);
  }, [events]);

  const previousWeek = () => {
    onDateChange(addDays(currentDate, -7));
  };

  const nextWeek = () => {
    onDateChange(addDays(currentDate, 7));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Group events by day
  const eventsByDay = weekDays.map(day => {
    return events.filter(event => {
      try {
        let eventStart;
        if (event.when?.startTime) {
          eventStart = new Date(event.when.startTime * 1000);
        } else if (event.when?.date) {
          eventStart = new Date(event.when.date);
        } else if (event.startTime) {
          eventStart = parseISO(event.startTime);
        } else {
          return false;
        }
        return isSameDay(eventStart, day);
      } catch (err) {
        console.error('Error parsing event date:', err, event);
        return false;
      }
    });
  });

  // Calculate event position and height
  const getEventStyle = (event: any) => {
    try {
      let start, end;

      if (event.when?.startTime && event.when?.endTime) {
        start = new Date(event.when.startTime * 1000);
        end = new Date(event.when.endTime * 1000);
      } else if (event.startTime && event.endTime) {
        start = parseISO(event.startTime);
        end = parseISO(event.endTime);
      } else {
        return { top: 0, height: 60 };
      }

      const startHour = start.getHours() + start.getMinutes() / 60;
      const endHour = end.getHours() + end.getMinutes() / 60;
      const duration = endHour - startHour;

      return {
        top: `${startHour * 60}px`, // 60px per hour
        height: `${Math.max(duration * 60, 30)}px`, // Minimum 30px
      };
    } catch (err) {
      console.error('Error calculating event style:', err, event);
      return { top: 0, height: 60 };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </h2>
      </div>

      {/* Week grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-max">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 border-r">
            <div className="h-12" /> {/* Spacer for day headers */}
            {hours.map(hour => (
              <div key={hour} className="h-[60px] pr-2 text-right text-xs text-muted-foreground border-t">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>

          {/* Days */}
          {weekDays.map((day, dayIndex) => {
            const isToday = isSameDay(day, new Date());
            const dayEvents = eventsByDay[dayIndex];

            return (
              <div key={dayIndex} className="flex-1 min-w-[120px] border-r relative">
                {/* Day header */}
                <div className={cn(
                  "h-12 flex flex-col items-center justify-center border-b",
                  isToday && "bg-primary/10"
                )}>
                  <div className="text-xs text-muted-foreground">
                    {format(day, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-lg font-semibold",
                    isToday && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>

                {/* Time slots */}
                <div className="relative">
                  {hours.map(hour => (
                    <div
                      key={hour}
                      onDoubleClick={() => onTimeSlotClick(day, hour)}
                      className="h-[60px] border-t hover:bg-accent/50 cursor-pointer transition-colors"
                      title="Double-click to create event"
                    />
                  ))}

                  {/* Events */}
                  <div className="absolute inset-0 pointer-events-none">
                    {dayEvents.map(event => {
                      const style = getEventStyle(event);
                      const conflicts = conflictMap.get(event.id) || [];
                      const hasConflict = conflicts.length > 0;
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
                            backgroundColor: hasConflict ? '#fee2e2' : `${hexColor}CC`, // Red tint if conflict, else 80% opacity
                            borderLeft: `3px solid ${hasConflict ? '#ef4444' : hexColor}`,
                          }}
                          className={cn(
                            "absolute left-1 right-1 rounded p-1 text-xs overflow-hidden pointer-events-auto cursor-pointer",
                            hasConflict ? 'text-red-900 ring-1 ring-red-400' : 'text-white'
                          )}
                          title={hasConflict ? `Conflicts with ${conflicts.length} event(s)` : undefined}
                        >
                          <div className="font-medium truncate flex items-center gap-1">
                            {hasConflict && (
                              <AlertTriangle className="h-3 w-3 text-red-600 flex-shrink-0" />
                            )}
                            <span className="truncate">{event.title}</span>
                          </div>
                          <div className="text-[10px] truncate opacity-90">
                            {event.location && event.location.trim() ? event.location : 'No location'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

