'use client';

import { useCalendarPro } from '@/contexts/CalendarProContext';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import EventCard from '../EventCard';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WeekView() {
  const { selectedDate, events, isLoadingEvents, setSelectedEvent } = useCalendarPro();

  // Get week start (Sunday)
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Generate hours from 6 AM to 10 PM
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      let eventDate: Date | null = null;

      if (event.when?.startTime) {
        eventDate = new Date(event.when.startTime * 1000);
      } else if (event.when?.date) {
        eventDate = new Date(event.when.date);
      } else if (event.startTime) {
        eventDate = new Date(event.startTime);
      } else if (event.start_time) {
        eventDate = new Date(event.start_time);
      }

      return eventDate && isSameDay(eventDate, day);
    });
  };

  // Position events in the timeline
  const getEventPosition = (event: any) => {
    let startDate: Date | null = null;

    if (event.when?.startTime) {
      startDate = new Date(event.when.startTime * 1000);
    } else if (event.startTime) {
      startDate = new Date(event.startTime);
    } else if (event.start_time) {
      startDate = new Date(event.start_time);
    }

    if (!startDate) return null;

    const hour = startDate.getHours();
    const minute = startDate.getMinutes();

    // Only show events between 6 AM and 10 PM
    if (hour < 6 || hour >= 23) return null;

    // Calculate position from top (each hour = 60px)
    const top = (hour - 6) * 60 + (minute / 60) * 60;

    // Calculate height based on duration
    let endDate: Date | null = null;
    if (event.when?.endTime) {
      endDate = new Date(event.when.endTime * 1000);
    } else if (event.endTime) {
      endDate = new Date(event.endTime);
    } else if (event.end_time) {
      endDate = new Date(event.end_time);
    }

    let height = 60; // Default 1 hour
    if (endDate) {
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      height = durationHours * 60;
    }

    return { top, height };
  };

  if (isLoadingEvents) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-border bg-background sticky top-0 z-10">
        <div className="w-16 flex-shrink-0 border-r border-border" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'flex-1 p-2 text-center border-r border-border',
              isToday(day) && 'bg-primary/5'
            )}
          >
            <div className="text-xs text-muted-foreground uppercase">
              {format(day, 'EEE')}
            </div>
            <div
              className={cn(
                'text-lg font-semibold mt-1',
                isToday(day) && 'text-primary'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Timeline grid */}
      <div className="flex-1 overflow-auto">
        <div className="relative">
          {/* Time labels */}
          <div className="absolute left-0 top-0 bottom-0 w-16 border-r border-border bg-background z-10">
            {hours.map(hour => (
              <div key={hour} className="h-[60px] flex items-start justify-end pr-2 pt-1 text-xs text-muted-foreground">
                {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="ml-16 flex">
            {weekDays.map((day, dayIndex) => {
              const dayEvents = getEventsForDay(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex-1 relative border-r border-border',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  {/* Hour slots */}
                  {hours.map(hour => (
                    <div key={hour} className="h-[60px] border-b border-border" />
                  ))}

                  {/* Events */}
                  <div className="absolute inset-0 pointer-events-none">
                    {dayEvents.map(event => {
                      const position = getEventPosition(event);
                      if (!position) return null;

                      return (
                        <div
                          key={event.id}
                          className="absolute left-1 right-1 pointer-events-auto"
                          style={{
                            top: `${position.top}px`,
                            height: `${position.height}px`,
                          }}
                        >
                          <EventCard
                            event={event}
                            onClick={() => setSelectedEvent(event)}
                            className="h-full overflow-hidden text-xs"
                            compact
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Current time indicator (only for today) */}
                  {isToday(day) && (() => {
                    const now = new Date();
                    const hour = now.getHours();
                    const minute = now.getMinutes();

                    if (hour >= 6 && hour < 23) {
                      const top = (hour - 6) * 60 + (minute / 60) * 60;

                      return (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: `${top}px` }}
                        >
                          <div className="flex items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <div className="flex-1 h-0.5 bg-red-500" />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
