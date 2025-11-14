/**
 * Year View Component
 * Annual overview showing all 12 months
 */

'use client';

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface YearViewProps {
  currentYear: Date;
  events: any[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: any) => void;
}

export default function YearView({ currentYear, events, onDateClick, onEventClick }: YearViewProps) {
  const year = currentYear.getFullYear();

  // Generate all 12 months
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      const eventDate = format(new Date(event.startTime), 'yyyy-MM-dd');
      return eventDate === dateStr;
    });
  };

  // Check if date has events
  const hasEvents = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-background">
      {/* Year Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold">{year}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {events.length} event{events.length !== 1 ? 's' : ''} this year
        </p>
      </div>

      {/* 12 Month Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {months.map((monthDate) => {
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
          const firstDayOfWeek = monthStart.getDay();
          const emptyCells = Array(firstDayOfWeek).fill(null);

          // Count events in this month
          const monthEvents = events.filter(event => {
            const eventDate = new Date(event.startTime);
            return isSameMonth(eventDate, monthDate);
          });

          return (
            <div
              key={monthDate.toString()}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Month Header */}
              <div className="mb-3">
                <h3 className="font-semibold text-sm text-center">
                  {format(monthDate, 'MMMM')}
                </h3>
                {monthEvents.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div
                    key={idx}
                    className="text-center text-[10px] font-medium text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells */}
                {emptyCells.map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {days.map((day) => {
                  const isTodayDate = isToday(day);
                  const dayHasEvents = hasEvents(day);
                  const dayEvents = getEventsForDate(day);

                  return (
                    <button
                      key={day.toString()}
                      onClick={() => {
                        if (dayHasEvents && dayEvents.length === 1) {
                          // If only one event, open it directly
                          onEventClick(dayEvents[0]);
                        } else {
                          // Otherwise, navigate to that date
                          onDateClick(day);
                        }
                      }}
                      className={cn(
                        "aspect-square relative rounded text-[10px] font-medium transition-all",
                        "hover:bg-accent hover:scale-110",
                        isTodayDate && "bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-1",
                        !isTodayDate && "text-foreground"
                      )}
                      title={dayHasEvents ? `${dayEvents.length} event${dayEvents.length !== 1 ? 's' : ''}` : undefined}
                    >
                      <span className="flex items-center justify-center h-full">
                        {format(day, 'd')}
                      </span>

                      {/* Event indicator */}
                      {dayHasEvents && !isTodayDate && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayEvents.length > 2 ? (
                            <div className="w-1 h-1 rounded-full bg-primary" />
                          ) : (
                            dayEvents.slice(0, 2).map((event, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "w-0.5 h-0.5 rounded-full",
                                  event.color === 'blue' && 'bg-blue-500',
                                  event.color === 'green' && 'bg-green-500',
                                  event.color === 'red' && 'bg-red-500',
                                  event.color === 'purple' && 'bg-purple-500',
                                  event.color === 'orange' && 'bg-orange-500',
                                  event.color === 'pink' && 'bg-pink-500',
                                  !event.color && 'bg-primary'
                                )}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
