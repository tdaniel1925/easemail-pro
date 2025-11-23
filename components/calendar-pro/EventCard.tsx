'use client';

import { CalendarEvent } from '@/contexts/CalendarProContext';
import { format } from 'date-fns';
import { Clock, MapPin, Users, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: CalendarEvent;
  onClick?: (e?: React.MouseEvent) => void;
  className?: string;
  showTime?: boolean;
  compact?: boolean;
}

export default function EventCard({ event, onClick, className, showTime = true, compact = false }: EventCardProps) {
  // Parse event time
  const getEventTime = () => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (event.when?.startTime) {
      startDate = new Date(event.when.startTime * 1000);
    } else if (event.when?.date) {
      startDate = new Date(event.when.date);
    } else if (event.startTime) {
      startDate = new Date(event.startTime);
    } else if (event.start_time) {
      startDate = new Date(event.start_time);
    }

    if (event.when?.endTime) {
      endDate = new Date(event.when.endTime * 1000);
    } else if (event.endTime) {
      endDate = new Date(event.endTime);
    } else if (event.end_time) {
      endDate = new Date(event.end_time);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getEventTime();

  // Get color class
  const getColorClass = () => {
    const color = event.color || 'blue';
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100',
      green: 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800 text-green-900 dark:text-green-100',
      red: 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100',
      purple: 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-100',
      orange: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-800 text-orange-900 dark:text-orange-100',
      pink: 'bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-800 text-pink-900 dark:text-pink-100',
      yellow: 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
      gray: 'bg-gray-100 dark:bg-gray-950 border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-100',
    };
    return colorMap[color] || colorMap.blue;
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'px-2 py-1 rounded border cursor-pointer hover:shadow-sm transition-shadow text-xs',
          getColorClass(),
          className
        )}
      >
        <div className="font-medium truncate">{event.title}</div>
        {showTime && startDate && (
          <div className="text-[10px] opacity-75 truncate">
            {format(startDate, 'h:mm a')}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all',
        getColorClass(),
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm truncate flex-1">{event.title}</h3>
        {event.busy && (
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-current opacity-50" />
        )}
      </div>

      {showTime && startDate && (
        <div className="flex items-center gap-1.5 text-xs opacity-75 mb-1">
          <Clock className="h-3 w-3" />
          <span>
            {format(startDate, 'h:mm a')}
            {endDate && ` - ${format(endDate, 'h:mm a')}`}
          </span>
        </div>
      )}

      {event.location && (
        <div className="flex items-center gap-1.5 text-xs opacity-75 mb-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{event.location}</span>
        </div>
      )}

      {event.participants && event.participants.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs opacity-75 mb-1">
          <Users className="h-3 w-3" />
          <span>{event.participants.length} attendee{event.participants.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {event.conferencing && (
        <div className="flex items-center gap-1.5 text-xs opacity-75">
          <Video className="h-3 w-3" />
          <span className="truncate">Video call</span>
        </div>
      )}

      {event.calendarName && (
        <div className="mt-2 text-[10px] opacity-50 truncate">
          {event.calendarName}
        </div>
      )}
    </div>
  );
}
