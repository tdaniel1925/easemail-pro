'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAccount } from '@/contexts/AccountContext';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color?: string;
  hexColor?: string;
  location?: string;
  when?: {
    startTime?: number;
    endTime?: number;
    date?: string;
  };
}

interface MiniCalendarProps {
  onQuickAddClick?: () => void;
  onEventClick?: (event: Event) => void;
}

export function MiniCalendar({ onQuickAddClick, onEventClick }: MiniCalendarProps = {}) {
  const { selectedAccount } = useAccount();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate mini calendar days
  const miniMonthStart = startOfMonth(currentMonth);
  const miniMonthEnd = endOfMonth(currentMonth);
  const miniDays = eachDayOfInterval({ start: miniMonthStart, end: miniMonthEnd });
  const miniStartDay = miniMonthStart.getDay();
  const miniEmptyCells = Array.from({ length: miniStartDay });

  // Fetch events for current month from selected account
  const fetchEvents = useCallback(async () => {
    setError(null);

    // If no selected account or no grant ID, return empty
    if (!selectedAccount || !selectedAccount.nylasGrantId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const startDate = startOfMonth(currentMonth);
      const endDate = endOfMonth(currentMonth);

      // Convert to Unix timestamps for Nylas v3 API
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      // Build API URL
      const apiUrl = `/api/nylas-v3/calendars/events?accountId=${selectedAccount.nylasGrantId}&start=${startTimestamp}&end=${endTimestamp}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setEvents(data.events || []);
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load events';
      setError(errorMessage);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedAccount]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Check if a date has events
  const hasEventsOnDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.some(event => {
      try {
        // Nylas v3 events use 'when' object with different formats
        let eventStartTime;
        if (event.when?.startTime) {
          eventStartTime = new Date(event.when.startTime * 1000); // Unix timestamp
        } else if (event.when?.date) {
          eventStartTime = new Date(event.when.date);
        } else if (event.startTime) {
          eventStartTime = new Date(event.startTime);
        } else {
          return false;
        }
        const eventDate = format(eventStartTime, 'yyyy-MM-dd');
        return eventDate === dateStr;
      } catch {
        return false;
      }
    });
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      try {
        // Nylas v3 events use 'when' object with different formats
        let eventStartTime;
        if (event.when?.startTime) {
          eventStartTime = new Date(event.when.startTime * 1000); // Unix timestamp
        } else if (event.when?.date) {
          eventStartTime = new Date(event.when.date);
        } else if (event.startTime) {
          eventStartTime = new Date(event.startTime);
        } else {
          return false;
        }
        const eventDate = format(eventStartTime, 'yyyy-MM-dd');
        return eventDate === dateStr;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      // Sort by start time
      let aStart, bStart;
      if (a.when?.startTime) {
        aStart = new Date(a.when.startTime * 1000);
      } else if (a.when?.date) {
        aStart = new Date(a.when.date);
      } else {
        aStart = new Date(a.startTime);
      }
      if (b.when?.startTime) {
        bStart = new Date(b.when.startTime * 1000);
      } else if (b.when?.date) {
        bStart = new Date(b.when.date);
      } else {
        bStart = new Date(b.startTime);
      }
      return aStart.getTime() - bStart.getTime();
    });
  };

  const formatEventTime = (startTime: string, endTime: string) => {
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
    } catch {
      return 'Time unavailable';
    }
  };

  return (
    <>
      {/* Mini Monthly Calendar */}
      <div className="p-4 border-b border-border">
        <div className="space-y-3">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Add Button */}
          {onQuickAddClick && (
            <Button
              size="sm"
              onClick={onQuickAddClick}
              className="w-full mb-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Quick Add Event
            </Button>
          )}

          {/* Mini Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Day Headers */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-xs font-medium text-muted-foreground py-1">
                {day}
              </div>
            ))}

            {/* Empty cells before month starts */}
            {miniEmptyCells.map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Calendar days */}
            {miniDays.map((day) => {
              const hasEvents = hasEventsOnDate(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square rounded-md text-xs flex items-center justify-center relative transition-colors",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
                    isTodayDate && "bg-primary text-primary-foreground font-semibold",
                    isSelected && !isTodayDate && "bg-accent",
                    !isSelected && !isTodayDate && "hover:bg-accent/50"
                  )}
                >
                  {format(day, 'd')}
                  {hasEvents && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Events Panel */}
      {selectedDate && (
        <div className="border-b border-border">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {(() => {
              const dayEvents = getEventsForDate(selectedDate);

              if (dayEvents.length === 0) {
                return (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No events scheduled
                  </div>
                );
              }

              return (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dayEvents.map((event) => {
                    // Parse event times for display
                    let startTime, endTime;
                    if (event.when?.startTime) {
                      startTime = new Date(event.when.startTime * 1000);
                      endTime = event.when?.endTime ? new Date(event.when.endTime * 1000) : startTime;
                    } else if (event.when?.date) {
                      startTime = new Date(event.when.date);
                      endTime = startTime;
                    } else {
                      startTime = new Date(event.startTime);
                      endTime = new Date(event.endTime);
                    }

                    return (
                      <button
                        key={event.id}
                        onClick={() => {
                          if (onEventClick) {
                            onEventClick(event);
                          } else {
                            // Fallback: navigate to calendar page
                            window.location.href = '/calendar';
                          }
                        }}
                        className="w-full text-left p-2 rounded-md hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className="w-1 h-full rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: event.hexColor || event.color || '#3b82f6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {event.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              📍 {event.location && event.location.trim() ? event.location : 'No location'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
