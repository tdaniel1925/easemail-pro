'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAccount } from '@/contexts/AccountContext';
import CalendarSelector from './CalendarSelector';
import { parseEventStartTime, getEventTitle } from '@/lib/calendar/event-utils';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color?: string;
}

export function MiniCalendar() {
  const { selectedAccount, accounts } = useAccount();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const pathname = usePathname();
  const calendarRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Function to open new event modal
  const handleNewEvent = () => {
    const isOnCalendarPage = pathname === '/calendar';
    
    if (isOnCalendarPage) {
      // If on calendar page, dispatch event to open modal
      const event = new CustomEvent('openEventModal', {
        detail: { date: new Date() }
      });
      window.dispatchEvent(event);
    } else {
      // If not on calendar page, navigate there
      window.location.href = '/calendar?openNew=true';
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear();
  };

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
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // Convert to Unix timestamps for Nylas v3 API
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      const endTimestamp = Math.floor(endDate.getTime() / 1000);

      // Build API URL with calendar filtering
      let apiUrl = `/api/nylas-v3/calendars/events?accountId=${selectedAccount.nylasGrantId}&start=${startTimestamp}&end=${endTimestamp}`;

      if (selectedCalendarIds.length > 0) {
        apiUrl += `&calendarIds=${selectedCalendarIds.join(',')}`;
      }

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
  }, [currentMonth, selectedAccount, selectedCalendarIds]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Check if a day has events
  const dayHasEvents = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return events.some(event => {
      const eventStart = parseEventStartTime(event);
      if (!eventStart) return false;
      try {
        return eventStart.toISOString().split('T')[0] === dateStr;
      } catch (err) {
        return false;
      }
    });
  };

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return events.filter(event => {
      const eventStart = parseEventStartTime(event);
      if (!eventStart) return false;
      try {
        return eventStart.toISOString().split('T')[0] === dateStr;
      } catch (err) {
        return false;
      }
    }).sort((a, b) => {
      const aStart = parseEventStartTime(a);
      const bStart = parseEventStartTime(b);
      if (!aStart || !bStart) return 0;
      return aStart.getTime() - bStart.getTime();
    });
  };

  // Handle mouse enter on day cell
  const handleDayMouseEnter = (day: number, event: React.MouseEvent<HTMLButtonElement>) => {
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length === 0) return;

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const calendarRect = calendarRef.current?.getBoundingClientRect();

    if (calendarRect) {
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Only show popup after a brief delay to avoid interfering with clicks
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredDay(day);

        // Calculate popup dimensions (approximate)
        const popupWidth = 280;
        const popupHeight = Math.min(250, 80 + dayEvents.length * 60);
        const padding = 16;

        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Start with position below the day cell (already in viewport coordinates)
        let top = rect.bottom + 8;
        let left = rect.left;

        // Check if popup would overflow bottom of viewport
        if (top + popupHeight > viewportHeight - padding) {
          // Try positioning above the day cell
          const topAbove = rect.top - popupHeight - 8;
          if (topAbove >= padding) {
            top = topAbove;
          } else {
            // If it doesn't fit above either, position at bottom with scroll
            top = Math.max(padding, viewportHeight - popupHeight - padding);
          }
        }

        // Check if popup would overflow right edge of viewport
        if (left + popupWidth > viewportWidth - padding) {
          // Shift left to fit in viewport
          left = Math.max(padding, viewportWidth - popupWidth - padding);
        }

        // Ensure popup doesn't overflow left edge
        if (left < padding) {
          left = padding;
        }

        // Use viewport coordinates directly for fixed positioning
        setPopupPosition({
          top,
          left,
        });
      }, 200);
    }
  };

  // Handle mouse leave
  const handleDayMouseLeave = () => {
    // Clear timeout if mouse leaves before popup shows
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredDay(null);
    setPopupPosition(null);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 px-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Calendar</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title="New Event"
          onClick={handleNewEvent}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar */}
      <div ref={calendarRef} className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">
            {monthNames[currentMonth.getMonth()].substring(0, 3)} {currentMonth.getFullYear()}
          </h3>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              className="h-6 w-6"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-6 w-6"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <div key={`header-${idx}`} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const todayDate = isToday(day);
            const selected = isSelected(day);
            const hasEvents = dayHasEvents(day);

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                }}
                onMouseEnter={(e) => handleDayMouseEnter(day, e)}
                onMouseLeave={handleDayMouseLeave}
                className={cn(
                  'aspect-square rounded-md text-xs font-medium transition-colors flex flex-col items-center justify-center relative',
                  todayDate && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  !todayDate && selected && 'bg-accent',
                  !todayDate && !selected && 'hover:bg-accent/50'
                )}
              >
                {day}
                {hasEvents && !todayDate && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hover Popup */}
        {hoveredDay !== null && popupPosition && (
          <div
            className="fixed z-50 min-w-[220px] max-w-[280px] bg-popover border border-border rounded-lg shadow-lg p-3"
            style={{
              top: `${popupPosition.top}px`,
              left: `${popupPosition.left}px`,
            }}
            onMouseEnter={() => setHoveredDay(hoveredDay)}
            onMouseLeave={handleDayMouseLeave}
          >
            <div className="mb-2">
              <p className="text-xs font-semibold text-foreground">
                {monthNames[currentMonth.getMonth()]} {hoveredDay}, {currentMonth.getFullYear()}
              </p>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {getEventsForDay(hoveredDay).map((event) => {
                const startTime = parseEventStartTime(event);
                const endTime = parseEventStartTime(event); // Use start for now since we may not have end

                const timeStr = startTime ? `${startTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}${endTime ? ` - ${endTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}` : ''}` : 'Time TBD';

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => window.location.href = '/calendar'}
                  >
                    <div className={cn(
                      'w-1 h-full rounded-full flex-shrink-0 mt-0.5',
                      event.color === 'blue' && 'bg-blue-500',
                      event.color === 'green' && 'bg-green-500',
                      event.color === 'red' && 'bg-red-500',
                      event.color === 'purple' && 'bg-purple-500',
                      event.color === 'orange' && 'bg-orange-500',
                      event.color === 'pink' && 'bg-pink-500',
                      !event.color && 'bg-primary'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-foreground">{getEventTitle(event)}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">{timeStr}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Calendar Selector */}
        <div className="pt-4 border-t border-border">
          <CalendarSelector
            accountId={selectedAccount?.nylasGrantId || null}
            selectedCalendarIds={selectedCalendarIds}
            onCalendarSelectionChange={setSelectedCalendarIds}
            className="border-0"
          />
        </div>
      </div>
    </div>
  );
}


