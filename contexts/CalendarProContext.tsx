'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export type ViewMode = 'day' | 'week' | 'month';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  when?: {
    startTime?: number;
    endTime?: number;
    date?: string;
  };
  startTime?: string;
  endTime?: string;
  start_time?: string;
  end_time?: string;
  calendarId: string;
  calendarName?: string;
  color?: string;
  hexColor?: string;
  busy?: boolean;
  participants?: Array<{ email: string; name?: string; status?: string }>;
  conferencing?: any;
  reminders?: any[];
  readOnly?: boolean;
  status?: string;
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  hexColor?: string;
  isPrimary?: boolean;
  readOnly?: boolean;
  timezone?: string;
}

interface CalendarProContextType {
  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;

  // Events
  events: CalendarEvent[];
  isLoadingEvents: boolean;
  eventsError: string | null;
  refreshEvents: () => Promise<void>;

  // Calendars
  calendars: Calendar[];
  isLoadingCalendars: boolean;
  selectedCalendarIds: string[];
  setSelectedCalendarIds: (ids: string[]) => void;
  toggleCalendar: (calendarId: string) => void;

  // Selected event
  selectedEvent: CalendarEvent | null;
  setSelectedEvent: (event: CalendarEvent | null) => void;

  // Account
  accountId: string | null;
  grantId: string | null;
}

const CalendarProContext = createContext<CalendarProContextType | undefined>(undefined);

interface CalendarProviderProps {
  children: ReactNode;
  accountId: string;
  grantId: string;
}

export function CalendarProvider({ children, accountId, grantId }: CalendarProviderProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Fetch calendars
  const fetchCalendars = useCallback(async () => {
    if (!grantId) return;

    setIsLoadingCalendars(true);
    try {
      const response = await fetch(`/api/nylas-v3/calendars?accountId=${grantId}`);
      const data = await response.json();

      if (data.success && data.calendars) {
        setCalendars(data.calendars);

        // Auto-select all calendars by default
        const allCalendarIds = data.calendars.map((cal: Calendar) => cal.id);
        setSelectedCalendarIds(allCalendarIds);
      }
    } catch (error) {
      console.error('Failed to fetch calendars:', error);
    } finally {
      setIsLoadingCalendars(false);
    }
  }, [grantId]);

  // Fetch events based on view mode and selected date
  const fetchEvents = useCallback(async () => {
    if (!grantId || selectedCalendarIds.length === 0) {
      setEvents([]);
      return;
    }

    setIsLoadingEvents(true);
    setEventsError(null);

    try {
      // Calculate date range based on view mode
      let start: Date;
      let end: Date;

      if (viewMode === 'day') {
        start = new Date(selectedDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(selectedDate);
        end.setHours(23, 59, 59, 999);
      } else if (viewMode === 'week') {
        start = startOfWeek(selectedDate, { weekStartsOn: 0 });
        end = endOfWeek(selectedDate, { weekStartsOn: 0 });
      } else {
        start = startOfMonth(selectedDate);
        end = endOfMonth(selectedDate);
      }

      // Convert to Unix timestamps
      const startTimestamp = Math.floor(start.getTime() / 1000);
      const endTimestamp = Math.floor(end.getTime() / 1000);

      const response = await fetch(
        `/api/nylas-v3/calendars/events?accountId=${grantId}&calendarIds=${selectedCalendarIds.join(',')}&start=${startTimestamp}&end=${endTimestamp}`
      );

      const data = await response.json();

      if (data.success && data.events) {
        setEvents(data.events);
      } else {
        setEventsError(data.error || 'Failed to fetch events');
      }
    } catch (error: any) {
      console.error('Failed to fetch events:', error);
      setEventsError(error.message || 'Failed to fetch events');
    } finally {
      setIsLoadingEvents(false);
    }
  }, [grantId, selectedCalendarIds, selectedDate, viewMode]);

  // Refresh events
  const refreshEvents = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  // Toggle calendar visibility
  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds(prev => {
      if (prev.includes(calendarId)) {
        return prev.filter(id => id !== calendarId);
      } else {
        return [...prev, calendarId];
      }
    });
  }, []);

  // Fetch calendars on mount
  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  // Fetch events when dependencies change
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const value: CalendarProContextType = {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    events,
    isLoadingEvents,
    eventsError,
    refreshEvents,
    calendars,
    isLoadingCalendars,
    selectedCalendarIds,
    setSelectedCalendarIds,
    toggleCalendar,
    selectedEvent,
    setSelectedEvent,
    accountId,
    grantId,
  };

  return (
    <CalendarProContext.Provider value={value}>
      {children}
    </CalendarProContext.Provider>
  );
}

export function useCalendarPro() {
  const context = useContext(CalendarProContext);
  if (context === undefined) {
    throw new Error('useCalendarPro must be used within a CalendarProvider');
  }
  return context;
}
