'use client';

import { useCalendarPro } from '@/contexts/CalendarProContext';
import { format, isSameDay } from 'date-fns';
import EventCard from '../EventCard';
import { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export default function DayView() {
  const { selectedDate, events, isLoadingEvents, setSelectedEvent } = useCalendarPro();
  const [dragStart, setDragStart] = useState<{ hour: number; minute: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Generate hours from 6 AM to 10 PM
  const hours = Array.from({ length: 17 }, (_, i) => i + 6);

  // Filter events for selected day
  const dayEvents = events.filter(event => {
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

    return eventDate && isSameDay(eventDate, selectedDate);
  });

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

    // Calculate position from top (each hour = 80px, 30min = 40px)
    const top = (hour - 6) * 80 + (minute / 60) * 80;

    // Calculate height based on duration
    let endDate: Date | null = null;
    if (event.when?.endTime) {
      endDate = new Date(event.when.endTime * 1000);
    } else if (event.endTime) {
      endDate = new Date(event.endTime);
    } else if (event.end_time) {
      endDate = new Date(event.end_time);
    }

    let height = 80; // Default 1 hour
    if (endDate) {
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      height = durationHours * 80;
    }

    return { top, height };
  };

  const handleMouseDown = (hour: number, minute: number) => {
    setDragStart({ hour, minute });
  };

  const handleMouseUp = (hour: number, minute: number) => {
    if (dragStart) {
      // Calculate start and end times
      const startHour = Math.min(dragStart.hour, hour);
      const startMinute = dragStart.minute;
      const endHour = Math.max(dragStart.hour, hour);
      const endMinute = minute;

      // Create new event (would open QuickAdd modal)
      console.log('Create event:', { startHour, startMinute, endHour, endMinute });

      setDragStart(null);
    }
  };

  if (isLoadingEvents) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border z-10 px-4 py-3">
        <h2 className="text-lg font-semibold">
          {format(selectedDate, 'EEEE, MMMM d, yyyy')}
        </h2>
      </div>

      {/* Timeline */}
      <div className="relative" ref={gridRef}>
        {/* Time labels */}
        <div className="absolute left-0 top-0 bottom-0 w-20 border-r border-border">
          {hours.map(hour => (
            <div key={hour} className="h-20 flex items-start justify-end pr-2 pt-1 text-xs text-muted-foreground">
              {format(new Date().setHours(hour, 0, 0, 0), 'h a')}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="ml-20 relative">
          {/* Hour slots */}
          {hours.map(hour => (
            <div key={hour} className="h-20 border-b border-border relative">
              {/* 30-minute divider */}
              <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/50" />

              {/* Clickable areas for event creation */}
              <div
                className="absolute inset-0 top-0 h-1/2 hover:bg-accent/30 cursor-pointer transition-colors"
                onMouseDown={() => handleMouseDown(hour, 0)}
                onMouseUp={() => handleMouseUp(hour, 0)}
              />
              <div
                className="absolute inset-0 top-1/2 h-1/2 hover:bg-accent/30 cursor-pointer transition-colors"
                onMouseDown={() => handleMouseDown(hour, 30)}
                onMouseUp={() => handleMouseUp(hour, 30)}
              />
            </div>
          ))}

          {/* Events */}
          <div className="absolute inset-0 pointer-events-none">
            {dayEvents.map(event => {
              const position = getEventPosition(event);
              if (!position) return null;

              return (
                <div
                  key={event.id}
                  className="absolute left-2 right-2 pointer-events-auto"
                  style={{
                    top: `${position.top}px`,
                    height: `${position.height}px`,
                  }}
                >
                  <EventCard
                    event={event}
                    onClick={() => setSelectedEvent(event)}
                    className="h-full overflow-hidden"
                    showTime={true}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Current time indicator */}
        {isSameDay(selectedDate, new Date()) && (() => {
          const now = new Date();
          const hour = now.getHours();
          const minute = now.getMinutes();

          if (hour >= 6 && hour < 23) {
            const top = (hour - 6) * 80 + (minute / 60) * 80;

            return (
              <div
                className="absolute left-20 right-0 z-20 pointer-events-none"
                style={{ top: `${top}px` }}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="flex-1 h-0.5 bg-red-500" />
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}
