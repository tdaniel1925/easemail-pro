/**
 * Agenda View Component
 * Displays calendar events in a list format grouped by date
 */

'use client';

import { useMemo } from 'react';
import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { Calendar, MapPin, Clock, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildConflictMap, type CalendarEvent } from '@/lib/calendar/calendar-utils';

// Utility to strip HTML tags and decode HTML entities
function sanitizeEventText(text: string | undefined | null): string {
  if (!text) return '';

  // First, decode HTML entities
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const decoded = doc.documentElement.textContent || '';

  // Remove any remaining HTML tags
  return decoded.replace(/<[^>]*>/g, '').trim();
}

interface AgendaViewProps {
  events: any[];
  onEventClick: (event: any) => void;
}

export default function AgendaView({ events, onEventClick }: AgendaViewProps) {
  // ✅ Build conflict map for all events (memoized for performance)
  const conflictMap = useMemo(() => {
    return buildConflictMap(events as CalendarEvent[]);
  }, [events]);

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = startOfDay(parseISO(event.startTime)).toISOString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort dates
  const sortedDates = Object.keys(eventsByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  if (sortedDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No events scheduled</h3>
        <p className="text-sm text-muted-foreground">
          Click "New Event" to add your first event
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-6 space-y-6">
        {sortedDates.map(dateKey => {
          const date = new Date(dateKey);
          const dateEvents = eventsByDate[dateKey].sort((a: any, b: any) => 
            parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime()
          );
          const isToday = isSameDay(date, new Date());
          const isTomorrow = isSameDay(date, new Date(Date.now() + 86400000));

          return (
            <div key={dateKey} className="space-y-3">
              {/* Date header */}
              <div className={cn(
                "sticky top-0 py-2 bg-background/95 backdrop-blur-sm z-10 border-b",
                isToday && "text-primary font-semibold"
              )}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-lg font-semibold">
                    {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : format(date, 'EEEE, MMMM d')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {format(date, 'yyyy')}
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {dateEvents.length} {dateEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
              </div>

              {/* Events for this date */}
              <div className="space-y-2">
                {dateEvents.map((event: any) => {
                  const start = parseISO(event.startTime);
                  const end = parseISO(event.endTime);
                  const conflicts = conflictMap.get(event.id) || [];
                  const hasConflict = conflicts.length > 0;

                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "group p-4 rounded-lg border cursor-pointer transition-all",
                        hasConflict
                          ? "border-red-400 bg-red-50/50 hover:border-red-500 hover:bg-red-50"
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                      )}
                    >
                      <div className="flex gap-4">
                        {/* Time */}
                        <div className="flex-shrink-0 w-24 text-sm">
                          <div className="font-medium">
                            {event.allDay ? 'All day' : format(start, 'h:mm a')}
                          </div>
                          {!event.allDay && (
                            <div className="text-muted-foreground">
                              {format(end, 'h:mm a')}
                            </div>
                          )}
                        </div>

                        {/* Color bar */}
                        <div
                          className="w-1 rounded-full flex-shrink-0"
                          style={{ backgroundColor: hasConflict ? '#ef4444' : (event.hexColor || '#3b82f6') }}
                        />

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-semibold text-base mb-1 transition-colors flex items-center gap-2",
                            hasConflict ? "text-red-900" : "group-hover:text-primary"
                          )}>
                            {hasConflict && (
                              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span>{sanitizeEventText(event.title)}</span>
                            {hasConflict && (
                              <span className="text-xs text-red-600 font-normal">
                                ({conflicts.length} conflict{conflicts.length > 1 ? 's' : ''})
                              </span>
                            )}
                          </h3>

                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {sanitizeEventText(event.description)}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{sanitizeEventText(event.location)}</span>
                              </div>
                            )}

                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                <span>{event.attendees.length} attendees</span>
                              </div>
                            )}

                            {event.reminders && event.reminders.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {event.reminders[0].minutesBefore}m reminder
                                </span>
                              </div>
                            )}

                            {event.isRecurring && (
                              <div className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                Recurring
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
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

