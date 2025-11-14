'use client';

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Loader2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, Suspense, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import EventModal from '@/components/calendar/EventModal';
import EventDetailsModal from '@/components/calendar/EventDetailsModal';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import AgendaView from '@/components/calendar/AgendaView';
import DraggableMonthView from '@/components/calendar/DraggableMonthView';
import QuickAdd from '@/components/calendar/QuickAdd';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { cn } from '@/lib/utils';
import { CalendarSkeleton } from '@/components/ui/skeleton';
import { useAccount } from '@/contexts/AccountContext';
import AccountSwitcher from '@/components/account/AccountSwitcher';
import { useToast } from '@/components/ui/use-toast';

type ViewType = 'month' | 'week' | 'day' | 'agenda';

function CalendarContent() {
  const { selectedAccount } = useAccount();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCalendarTypes, setSelectedCalendarTypes] = useState<string[]>([
    'personal', 'work', 'family', 'holiday', 'birthday', 'meeting', 'task'
  ]);
  const searchParams = useSearchParams();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

  // Filter events based on selected calendar types
  const filteredEvents = useMemo(() => {
    if (selectedCalendarTypes.length === 0) return [];

    return events.filter(event => {
      const eventType = event.calendarType || 'personal';
      return selectedCalendarTypes.includes(eventType);
    });
  }, [events, selectedCalendarTypes]);

  // Get available calendar types from current events
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(event => {
      const eventType = event.calendarType || 'personal';
      types.add(eventType);
    });
    return Array.from(types);
  }, [events]);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Fetch events for selected account
  const fetchEvents = useCallback(async () => {
    // Clear previous error
    setError(null);

    // Validate account selection
    if (!selectedAccount) {
      setEvents([]);
      setLoading(false);
      setError('Please select an account to view calendar events');
      return;
    }

    if (!selectedAccount.nylasGrantId) {
      setEvents([]);
      setLoading(false);
      setError('This account is not connected. Please reconnect your account to enable calendar access.');
      return;
    }

    try {
      setLoading(true);
      // Get first and last day of current month
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const response = await fetch(
        `/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&grantId=${selectedAccount.nylasGrantId}`
      );

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
      const errorMessage = error instanceof Error ? error.message : 'Failed to load calendar events';
      setError(errorMessage);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedAccount]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Check for openNew query parameter
  useEffect(() => {
    const openNew = searchParams.get('openNew');
    if (openNew === 'true') {
      setSelectedDate(new Date());
      setSelectedEvent(null);
      setIsEventModalOpen(true);
      // Clear the query parameter
      window.history.replaceState({}, '', '/calendar');
    }
  }, [searchParams]);

  // Listen for event modal open requests from MiniCalendar
  useEffect(() => {
    const handleOpenEventModal = (event: any) => {
      const { date } = event.detail;
      setSelectedDate(date || new Date());
      setSelectedEvent(null);
      setIsEventModalOpen(true);
    };

    window.addEventListener('openEventModal' as any, handleOpenEventModal);
    return () => window.removeEventListener('openEventModal' as any, handleOpenEventModal);
  }, []);

  // Get events for a specific day (using filtered events)
  const getEventsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];

    return filteredEvents.filter(event => {
      const eventStart = new Date(event.startTime);
      const eventDateStr = eventStart.toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: any) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  const handleEditEvent = () => {
    setIsEventDetailsOpen(false);
    setIsEventModalOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setIsEventModalOpen(true);
  };

  const handleSync = async () => {
    // Validate selected account
    if (!selectedAccount) {
      toast({
        title: 'No Account Selected',
        description: 'Please select an account to sync calendar events.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAccount.nylasGrantId) {
      toast({
        title: 'Account Not Connected',
        description: 'This account is not connected. Please reconnect to sync.',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    try {
      // All accounts use Nylas, so use the Nylas sync endpoint
      const syncResponse = await fetch('/api/calendar/sync/nylas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount.id }),
      });

      const syncData = await syncResponse.json();

      if (syncResponse.ok && syncData.success) {
        toast({
          title: 'Sync Complete',
          description: `Successfully synced ${syncData.synced || 0} events`,
        });
        // Refresh events
        await fetchEvents();
      } else {
        // Handle permission errors with actionable guidance
        const errorMessage = syncData.error || 'Sync failed';
        const isPermissionError = errorMessage.includes('Calendar access not granted') ||
                                 errorMessage.includes('calendar permissions');

        toast({
          title: isPermissionError ? 'Calendar Permissions Required' : 'Sync Failed',
          description: isPermissionError
            ? 'This account needs calendar access. Please go to Settings > Accounts to reconnect with calendar permissions.'
            : errorMessage,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync calendar';
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleEventMove = async (eventId: string, newDate: Date) => {
    try {
      // Find the event
      const event = events.find(e => e.id === eventId);
      if (!event) {
        toast({
          title: 'Event Not Found',
          description: 'Could not find the event to move',
          variant: 'destructive',
        });
        return;
      }

      // Calculate time difference
      const oldStart = new Date(event.startTime);
      const oldEnd = new Date(event.endTime);
      const timeDiff = oldEnd.getTime() - oldStart.getTime();

      // Set new start time (keep same time of day)
      const newStart = new Date(newDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes());

      // Calculate new end time
      const newEnd = new Date(newStart.getTime() + timeDiff);

      // Update event
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to move event: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Event Moved',
          description: 'Event has been successfully moved to the new date',
        });
        // Refresh events
        await fetchEvents();
      } else {
        throw new Error(data.error || 'Failed to move event');
      }
    } catch (error) {
      console.error('Error moving event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to move event';
      toast({
        title: 'Error Moving Event',
        description: errorMessage,
        variant: 'destructive',
      });
      // Refresh to show correct state
      await fetchEvents();
    }
  };

  return (
    <div className="flex w-full h-screen bg-background">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Calendar</h1>
              <p className="text-sm text-muted-foreground">Manage your schedule and events</p>
              <a
                href="/inbox"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 19-7-7 7-7"/>
                  <path d="M19 12H5"/>
                </svg>
                Back to Inbox
              </a>
            </div>
            {/* Account Switcher */}
            <div className="ml-4">
              <AccountSwitcher showManagementOptions={false} />
            </div>
          </div>
          <div className="flex gap-2">
            {/* View selector */}
            <div className="flex gap-1 border border-border rounded-lg p-1">
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('month')}
              >
                Month
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('week')}
              >
                Week
              </Button>
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('day')}
              >
                Day
              </Button>
              <Button
                variant={view === 'agenda' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('agenda')}
              >
                Agenda
              </Button>
            </div>

            {/* Calendar Type Filters */}
            <CalendarFilters
              selectedTypes={selectedCalendarTypes}
              onTypesChange={setSelectedCalendarTypes}
              availableTypes={availableTypes}
            />

            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
              Sync
            </Button>
            <Button variant="outline" onClick={() => setIsQuickAddOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
            <Button onClick={handleNewEvent}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Unable to load calendar</h3>
              <p className="text-sm text-destructive/90 mt-1">{error}</p>
              {error.includes('reconnect') && (
                <p className="text-sm text-destructive/80 mt-2">
                  Go to <a href="/settings" className="underline font-medium">Settings → Accounts</a> to reconnect with calendar permissions.
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchEvents()}
              className="flex-shrink-0"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Calendar Card */}
        <div className="flex-1 bg-card border border-border rounded-lg overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center space-y-3">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Calendar events could not be loaded</p>
                <Button onClick={() => fetchEvents()}>Try Again</Button>
              </div>
            </div>
          ) : (
            <>
              {view === 'month' && (
                <DraggableMonthView
                  currentMonth={currentMonth}
                  events={filteredEvents}
                  onMonthChange={setCurrentMonth}
                  onEventMove={handleEventMove}
                  onDayClick={handleDayClick}
                  onEventClick={handleEventClick}
                />
              )}

              {view === 'week' && (
                <WeekView
                  events={filteredEvents}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                    setIsEventDetailsOpen(true);
                  }}
                  onTimeSlotClick={(date, hour) => {
                    const clickedDate = new Date(date);
                    clickedDate.setHours(hour);
                    setSelectedDate(clickedDate);
                    setSelectedEvent(null);
                    setIsEventModalOpen(true);
                  }}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                />
              )}

              {view === 'day' && (
                <DayView
                  events={filteredEvents}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                    setIsEventDetailsOpen(true);
                  }}
                  onTimeSlotClick={(date, hour) => {
                    const clickedDate = new Date(date);
                    clickedDate.setHours(hour);
                    setSelectedDate(clickedDate);
                    setSelectedEvent(null);
                    setIsEventModalOpen(true);
                  }}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                />
              )}

              {view === 'agenda' && (
                <AgendaView
                  events={filteredEvents}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                    setIsEventDetailsOpen(true);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Event Details Modal (View Only) */}
      <EventDetailsModal
        isOpen={isEventDetailsOpen}
        onClose={() => {
          setIsEventDetailsOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onEdit={handleEditEvent}
        onDelete={() => {
          setIsEventDetailsOpen(false);
          setSelectedEvent(null);
        }}
        onSuccess={() => {
          fetchEvents();
        }}
      />

      {/* Event Modal (Create/Edit) */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        }}
        event={selectedEvent}
        defaultDate={selectedDate || undefined}
        onSuccess={() => {
          fetchEvents();
        }}
      />

      {/* Quick Add */}
      <QuickAdd
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onEventCreated={() => {
          fetchEvents();
        }}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarContent />
    </Suspense>
  );
}

