/**
 * List View Component
 * Chronological list of all events
 */

'use client';

import { useMemo } from 'react';
import { format, isToday, isTomorrow, isYesterday, isPast, differenceInMinutes } from 'date-fns';
import { Calendar, Clock, MapPin, Users, Video, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildConflictMap, type CalendarEvent } from '@/lib/calendar/calendar-utils';

interface ListViewProps {
  events: any[];
  onEventClick: (event: any) => void;
  currentDate: Date;
}

export default function ListView({ events, onEventClick, currentDate }: ListViewProps) {
  // ✅ Build conflict map for all events (memoized for performance)
  const conflictMap = useMemo(() => {
    return buildConflictMap(events as CalendarEvent[]);
  }, [events]);

  // Group events by date
  const groupedEvents = events.reduce((groups: Record<string, any[]>, event) => {
    const eventDate = new Date(event.startTime);
    const dateKey = format(eventDate, 'yyyy-MM-dd');

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort();

  // Format date header
  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);

    if (isToday(date)) {
      return `Today • ${format(date, 'EEEE, MMMM d')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow • ${format(date, 'EEEE, MMMM d')}`;
    } else if (isYesterday(date)) {
      return `Yesterday • ${format(date, 'EEEE, MMMM d')}`;
    } else {
      return format(date, 'EEEE, MMMM d, yyyy');
    }
  };

  // Check if event has meeting link
  const hasMeetingLink = (event: any) => {
    const text = `${event.description || ''} ${event.location || ''}`.toLowerCase();
    return text.includes('zoom.us') ||
           text.includes('meet.google.com') ||
           text.includes('teams.microsoft.com') ||
           text.includes('webex.com');
  };

  // Format duration
  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = differenceInMinutes(end, start);

    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Calendar className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No events found</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don't have any events scheduled. Create a new event to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {sortedDates.map((dateStr) => {
          const date = new Date(dateStr);
          const dayEvents = groupedEvents[dateStr].sort((a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          );
          const isDatePast = isPast(date) && !isToday(date);

          return (
            <div key={dateStr} className={cn(
              "space-y-3",
              isDatePast && "opacity-60"
            )}>
              {/* Date Header */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDateHeader(dateStr)}
                  <span className="text-xs font-normal">
                    ({dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''})
                  </span>
                </h3>
              </div>

              {/* Events for this date */}
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const startTime = new Date(event.startTime);
                  const endTime = new Date(event.endTime);
                  const isEventPast = isPast(endTime);
                  const hasLocation = event.location && event.location.trim() !== '';
                  const hasAttendees = event.attendees && event.attendees.length > 0;
                  const hasLink = hasMeetingLink(event);
                  const conflicts = conflictMap.get(event.id) || [];
                  const hasConflict = conflicts.length > 0;

                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "w-full group relative flex gap-4 p-4 rounded-lg border transition-all text-left",
                        "hover:shadow-md hover:scale-[1.01]",
                        hasConflict
                          ? "border-red-400 bg-red-50/50 hover:bg-red-50"
                          : "border-border bg-card hover:bg-accent/50",
                        isEventPast && "opacity-75"
                      )}
                    >
                      {/* Color Bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                        style={{ backgroundColor: hasConflict ? '#ef4444' : (event.hexColor || event.color || '#3b82f6') }}
                      />

                      {/* Time */}
                      <div className="w-24 flex-shrink-0 pt-1">
                        <p className="text-sm font-semibold">
                          {event.allDay ? 'All day' : format(startTime, 'h:mm a')}
                        </p>
                        {!event.allDay && (
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(event.startTime, event.endTime)}
                          </p>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Title */}
                        <h4 className={cn(
                          "font-semibold text-base transition-colors flex items-center gap-2",
                          hasConflict ? "text-red-900" : "group-hover:text-primary"
                        )}>
                          {hasConflict && (
                            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                          )}
                          <span>{event.title}</span>
                        </h4>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {!event.allDay && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}</span>
                            </div>
                          )}

                          {hasLocation && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{event.location}</span>
                            </div>
                          )}

                          {hasAttendees && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}

                          {hasLink && (
                            <div className="flex items-center gap-1 text-primary">
                              <Video className="h-3 w-3" />
                              <span className="font-medium">Meeting link</span>
                            </div>
                          )}

                          {event.calendarType && (
                            <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
                              {event.calendarType}
                            </span>
                          )}

                          {hasConflict && (
                            <div className="flex items-center gap-1 text-red-600 font-medium">
                              <span>{conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Description Preview */}
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Status Badge */}
                      {isEventPast && (
                        <div className="flex-shrink-0">
                          <span className="px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                            Past
                          </span>
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
