'use client';

import { useCalendarPro } from '@/contexts/CalendarProContext';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
} from 'date-fns';
import EventCard from '../EventCard';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MonthView() {
  const { selectedDate, events, isLoadingEvents, setSelectedEvent, setSelectedDate, setViewMode } = useCalendarPro();

  // Get all days to display (including leading/trailing days)
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

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

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setViewMode('day');
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
      {/* Month header */}
      <div className="border-b border-border bg-background">
        <div className="flex">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="flex-1 p-2 text-center text-xs font-medium text-muted-foreground uppercase border-r border-border last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-rows-[repeat(auto-fit,minmax(0,1fr))] h-full">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex border-b border-border last:border-b-0">
              {week.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const isDayToday = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'flex-1 border-r border-border last:border-r-0 p-2 cursor-pointer hover:bg-accent/30 transition-colors',
                      !isCurrentMonth && 'bg-muted/20',
                      isDayToday && 'bg-primary/5'
                    )}
                    onClick={() => handleDayClick(day)}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          !isCurrentMonth && 'text-muted-foreground',
                          isDayToday && 'bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={(e) => {
                            e?.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          compact
                          showTime={false}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-2">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
