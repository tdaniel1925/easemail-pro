/**
 * Calendar View Component
 * Displays calendar events in month/week/day views
 */

'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  when: {
    start_time?: number;
    end_time?: number;
    date?: string;
  };
  participants?: Array<{
    email: string;
    name?: string;
    status?: string;
  }>;
  location?: string;
  status?: string;
  busy?: boolean;
  calendar_id: string;
}

interface CalendarViewProps {
  accountId: string;
  calendarId?: string;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: () => void;
}

type ViewMode = 'month' | 'week' | 'day';

export function CalendarView({
  accountId,
  calendarId,
  onEventClick,
  onCreateEvent,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [currentDate, viewMode, accountId, calendarId]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate start and end dates based on view mode
      const { start, end } = getViewRange(currentDate, viewMode);

      let url = `/api/nylas-v3/calendars/events?accountId=${accountId}`;
      if (calendarId) {
        url += `&calendarId=${calendarId}`;
      }
      url += `&start=${Math.floor(start.getTime() / 1000)}`;
      url += `&end=${Math.floor(end.getTime() / 1000)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const getViewRange = (date: Date, mode: ViewMode) => {
    const start = new Date(date);
    const end = new Date(date);

    switch (mode) {
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  };

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);

    switch (viewMode) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
    }

    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getHeaderText = () => {
    switch (viewMode) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'week':
        const { start, end } = getViewRange(currentDate, 'week');
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const renderMonthView = () => {
    const { start } = getViewRange(currentDate, 'month');
    const startDay = start.getDay();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Add day headers
    days.push(
      <div key="headers" className="grid grid-cols-7 gap-px bg-border mb-px">
        {dayNames.map((name) => (
          <div key={name} className="bg-card p-2 text-center text-sm font-medium text-muted-foreground">
            {name}
          </div>
        ))}
      </div>
    );

    // Add empty cells for days before month starts
    const cells = [];
    for (let i = 0; i < startDay; i++) {
      cells.push(
        <div key={`empty-${i}`} className="bg-muted/30 min-h-[100px] p-2"></div>
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = events.filter(event => {
        const eventDate = event.when.start_time
          ? new Date(event.when.start_time * 1000)
          : event.when.date
          ? new Date(event.when.date)
          : null;

        return eventDate &&
          eventDate.getDate() === cellDate.getDate() &&
          eventDate.getMonth() === cellDate.getMonth() &&
          eventDate.getFullYear() === cellDate.getFullYear();
      });

      const isToday = cellDate.toDateString() === new Date().toDateString();

      cells.push(
        <div
          key={day}
          className="bg-card min-h-[100px] p-2 border-t border-border hover:bg-accent/50 transition-colors"
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="text-xs p-1 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20 truncate"
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    days.push(
      <div key="grid" className="grid grid-cols-7 gap-px bg-border">
        {cells}
      </div>
    );

    return <div>{days}</div>;
  };

  const renderWeekView = () => {
    const { start } = getViewRange(currentDate, 'week');
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);

      const dayEvents = events.filter(event => {
        const eventDate = event.when.start_time
          ? new Date(event.when.start_time * 1000)
          : event.when.date
          ? new Date(event.when.date)
          : null;

        return eventDate && eventDate.toDateString() === day.toDateString();
      });

      const isToday = day.toDateString() === new Date().toDateString();

      days.push(
        <div key={i} className="flex-1 border-r border-border last:border-r-0">
          <div className={`p-2 border-b border-border text-center ${isToday ? 'bg-primary/10' : ''}`}>
            <div className="text-xs text-muted-foreground">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={`text-lg font-medium ${isToday ? 'text-primary' : ''}`}>
              {day.getDate()}
            </div>
          </div>
          <div className="p-2 space-y-1">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="text-sm p-2 rounded bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
              >
                <div className="font-medium truncate">{event.title}</div>
                {event.when.start_time && (
                  <div className="text-xs opacity-75">
                    {new Date(event.when.start_time * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="flex border border-border rounded-lg overflow-hidden">{days}</div>;
  };

  const renderDayView = () => {
    const dayEvents = events.filter(event => {
      const eventDate = event.when.start_time
        ? new Date(event.when.start_time * 1000)
        : event.when.date
        ? new Date(event.when.date)
        : null;

      return eventDate && eventDate.toDateString() === currentDate.toDateString();
    });

    return (
      <div className="border border-border rounded-lg p-4">
        <div className="space-y-2">
          {dayEvents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No events for this day
            </div>
          ) : (
            dayEvents.map((event) => (
              <Card
                key={event.id}
                className="p-4 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => onEventClick?.(event)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {event.when.start_time && (
                        <span>
                          {new Date(event.when.start_time * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {event.when.end_time && (
                            <> - {new Date(event.when.end_time * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
                          )}
                        </span>
                      )}
                      {event.location && <span>{event.location}</span>}
                    </div>
                  </div>
                  {event.busy && (
                    <Badge variant="default" className="ml-2">Busy</Badge>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchEvents}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold ml-4">{getHeaderText()}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
          </div>
          {onCreateEvent && (
            <Button onClick={onCreateEvent}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>
    </div>
  );
}
