/**
 * Agenda View Component
 * Displays calendar events in a list format grouped by date
 */

'use client';

import { format, parseISO, isSameDay, startOfDay } from 'date-fns';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgendaViewProps {
  events: any[];
  onEventClick: (event: any) => void;
}

export default function AgendaView({ events, onEventClick }: AgendaViewProps) {
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

                  return (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="group p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-all"
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
                        <div className={cn(
                          'w-1 rounded-full flex-shrink-0',
                          event.color === 'blue' && 'bg-blue-500',
                          event.color === 'green' && 'bg-green-500',
                          event.color === 'red' && 'bg-red-500',
                          event.color === 'purple' && 'bg-purple-500',
                          event.color === 'orange' && 'bg-orange-500',
                          event.color === 'pink' && 'bg-pink-500'
                        )} />

                        {/* Event details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                            {event.title}
                          </h3>

                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{event.location}</span>
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

