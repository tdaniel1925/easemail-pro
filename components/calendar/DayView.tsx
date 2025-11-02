/**
 * Day View Component
 * Displays calendar in single-day format with detailed time slots
 */

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, addDays, isSameDay, parseISO } from 'date-fns';

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
    const eventStart = parseISO(event.startTime);
    return isSameDay(eventStart, currentDate);
  });

  // Calculate event position and height
  const getEventStyle = (event: any) => {
    const start = parseISO(event.startTime);
    const end = parseISO(event.endTime);
    
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
                onClick={() => onTimeSlotClick(currentDate, hour)}
                className="h-[80px] border-t hover:bg-accent/50 cursor-pointer transition-colors"
              />
            ))}

            {/* Events */}
            <div className="absolute inset-0 pointer-events-none px-2">
              {dayEvents.map(event => {
                const style = getEventStyle(event);
                const start = parseISO(event.startTime);
                const end = parseISO(event.endTime);
                
                return (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    style={style}
                    className={cn(
                      'absolute left-2 right-2 rounded-lg p-3 pointer-events-auto cursor-pointer shadow-md',
                      'hover:shadow-lg transition-shadow',
                      event.color === 'blue' && 'bg-blue-500 text-white',
                      event.color === 'green' && 'bg-green-500 text-white',
                      event.color === 'red' && 'bg-red-500 text-white',
                      event.color === 'purple' && 'bg-purple-500 text-white',
                      event.color === 'orange' && 'bg-orange-500 text-white',
                      event.color === 'pink' && 'bg-pink-500 text-white'
                    )}
                  >
                    <div className="font-semibold">{event.title}</div>
                    <div className="text-sm opacity-90">
                      {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                    </div>
                    {event.location && (
                      <div className="text-sm opacity-90 mt-1">
                        📍 {event.location}
                      </div>
                    )}
                    {event.description && (
                      <div className="text-sm opacity-90 mt-1 line-clamp-2">
                        {event.description}
                      </div>
                    )}
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

