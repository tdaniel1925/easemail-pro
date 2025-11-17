/**
 * World-Class Calendar Page
 * Inspired by Outlook, Google Calendar, and Superhuman
 */

'use client';

import { useState, Suspense, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIconLucide,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAccount } from '@/contexts/AccountContext';
import { useToast } from '@/components/ui/use-toast';

// Calendar Components
import EventModal from '@/components/calendar/EventModal';
import EventDetailsModal from '@/components/calendar/EventDetailsModal';
import DraggableMonthView from '@/components/calendar/DraggableMonthView';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import AgendaView from '@/components/calendar/AgendaView';
import YearView from '@/components/calendar/YearView';
import ListView from '@/components/calendar/ListView';
import QuickAdd from '@/components/calendar/QuickAdd';
import EventSearch from '@/components/calendar/EventSearch';
import CalendarSelector from '@/components/calendar/CalendarSelector';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isSameMonth } from 'date-fns';

type ViewType = 'month' | 'week' | 'day' | 'agenda' | 'year' | 'list';

function CalendarContent() {
  const { selectedAccount } = useAccount();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // View State
  const [view, setView] = useState<ViewType>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date());

  // Data State
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [selectedCalendarTypes, setSelectedCalendarTypes] = useState<string[]>([
    'personal', 'work', 'family', 'holiday', 'birthday', 'meeting', 'task'
  ]);

  // Mini Calendar State
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [selectedMiniDate, setSelectedMiniDate] = useState<Date | null>(null);

  // Calendar Selection State
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);

  // Filtered events based on search and calendar types
  const filteredEvents = useMemo(() => {
    const baseEvents = isSearchActive ? searchResults : events;

    if (selectedCalendarTypes.length === 0) return [];

    return baseEvents.filter(event => {
      const eventType = event.calendarType || 'personal';
      return selectedCalendarTypes.includes(eventType);
    });
  }, [events, searchResults, isSearchActive, selectedCalendarTypes]);

  // Get available calendar types
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    events.forEach(event => {
      const eventType = event.calendarType || 'personal';
      types.add(eventType);
    });
    return Array.from(types);
  }, [events]);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setError(null);

    if (!selectedAccount) {
      setEvents([]);
      setLoading(false);
      if (initialLoadDone) {
        setError('Please select an account to view calendar events');
      }
      setInitialLoadDone(true);
      return;
    }

    if (!selectedAccount.nylasGrantId) {
      setEvents([]);
      setLoading(false);
      if (initialLoadDone) {
        setError('This account is not connected. Please reconnect your account.');
      }
      setInitialLoadDone(true);
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
      setInitialLoadDone(true);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load calendar events';
      setError(errorMessage);
      setEvents([]);
      setInitialLoadDone(true);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedAccount, selectedCalendarIds, initialLoadDone]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle search results
  const handleSearchResults = useCallback((results: any[]) => {
    setSearchResults(results);
    setIsSearchActive(results.length !== events.length);
  }, [events.length]);

  // Sync calendar
  const handleSync = async () => {
    if (!selectedAccount?.nylasGrantId) {
      toast({
        title: 'No Account Selected',
        description: 'Please select an account to sync.',
        variant: 'destructive',
      });
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('/api/calendar/sync/nylas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount.id }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Sync Complete',
          description: `Successfully synced ${data.synced || 0} events`,
        });
        await fetchEvents();
      } else {
        toast({
          title: 'Sync Failed',
          description: data.error || 'Failed to sync calendar',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: 'Sync Failed',
        description: 'An error occurred while syncing',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Navigation functions
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setCurrentDate(today);
    setCurrentYear(today);
    setMiniCalendarMonth(today);
    setSelectedMiniDate(null); // Clear date filter
    if (view !== 'month') setView('month'); // Switch to month view
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Event handlers
  const handleNewEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setIsEventModalOpen(true);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEventDetailsOpen(true);
  };

  const handleDayClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEditEvent = () => {
    setIsEventDetailsOpen(false);
    setIsEventModalOpen(true);
  };

  const handleEventMove = async (eventId: string, newDate: Date) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const oldStart = new Date(event.startTime);
      const oldEnd = new Date(event.endTime);
      const timeDiff = oldEnd.getTime() - oldStart.getTime();

      const newStart = new Date(newDate);
      newStart.setHours(oldStart.getHours(), oldStart.getMinutes());
      const newEnd = new Date(newStart.getTime() + timeDiff);

      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: newStart.toISOString(),
          endTime: newEnd.toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({ title: 'Event Moved', description: 'Event updated successfully' });
        await fetchEvents();
      } else {
        throw new Error(data.error || 'Failed to move event');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      await fetchEvents();
    }
  };

  // Mini calendar functions
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      const eventDate = format(new Date(event.startTime), 'yyyy-MM-dd');
      return eventDate === dateStr;
    });
  };

  const hasEventsOnDate = (date: Date) => {
    return getEventsForDate(date).length > 0;
  };

  const miniMonthStart = startOfMonth(miniCalendarMonth);
  const miniMonthEnd = endOfMonth(miniCalendarMonth);
  const miniDays = eachDayOfInterval({ start: miniMonthStart, end: miniMonthEnd });
  const miniFirstDayOfWeek = miniMonthStart.getDay();
  const miniEmptyCells = Array(miniFirstDayOfWeek).fill(null);

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border bg-card">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back to Inbox + Title & Navigation */}
              <div className="flex items-center gap-4">
                <a
                  href="/inbox"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Inbox</span>
                </a>

                <div className="h-6 w-px bg-border" />

                <div className="flex items-center gap-3">
                  <CalendarIconLucide className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold">Calendar</h1>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                  >
                    Today
                  </Button>

                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={previousMonth}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[140px] text-center">
                      <span className="font-semibold">
                        {format(currentMonth, 'MMMM yyyy')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMonth}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                  Sync
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickAddOpen(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Quick Add
                </Button>

                <Button
                  size="sm"
                  onClick={handleNewEvent}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Event
                </Button>
              </div>
            </div>

            {/* Second Row: Search & View Selector */}
            <div className="flex items-center justify-between mt-4 gap-4">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <EventSearch
                  events={events}
                  onResultsChange={handleSearchResults}
                />
              </div>

              {/* View Selector */}
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                {(['month', 'week', 'day', 'year', 'agenda', 'list'] as ViewType[]).map((v) => (
                  <Button
                    key={v}
                    variant={view === v ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setView(v)}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading && !initialLoadDone ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={fetchEvents}>Retry</Button>
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
                  onEventClick={(e, event) => handleEventClick(event)}
                />
              )}

              {view === 'week' && (
                <WeekView
                  events={filteredEvents}
                  onEventClick={handleEventClick}
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
                  onEventClick={handleEventClick}
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

              {view === 'year' && (
                <YearView
                  currentYear={currentYear}
                  events={filteredEvents}
                  onDateClick={(date) => {
                    setCurrentMonth(date);
                    setCurrentDate(date);
                    setView('month');
                  }}
                  onEventClick={handleEventClick}
                />
              )}

              {view === 'agenda' && (
                <AgendaView
                  events={filteredEvents}
                  onEventClick={handleEventClick}
                />
              )}

              {view === 'list' && (
                <ListView
                  events={filteredEvents}
                  currentDate={currentDate}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-border bg-card flex flex-col">
        {/* Mini Calendar */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {format(miniCalendarMonth, 'MMMM yyyy')}
            </h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setMiniCalendarMonth(
                  new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() - 1)
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setMiniCalendarMonth(
                  new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() + 1)
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={idx} className="text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {miniEmptyCells.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}

            {miniDays.map((day) => {
              const isSelected = selectedMiniDate ? isSameDay(day, selectedMiniDate) : isSameDay(day, currentDate);
              const isTodayDate = isToday(day);
              const hasEvents = hasEventsOnDate(day);
              const isCurrentMonth = isSameMonth(day, miniCalendarMonth);

              return (
                <button
                  key={day.toString()}
                  onClick={() => {
                    setSelectedMiniDate(day);
                    setCurrentDate(day);
                    setCurrentMonth(day);
                    if (view !== 'month') setView('month');
                  }}
                  className={cn(
                    "aspect-square relative rounded-md text-xs font-medium transition-colors",
                    "hover:bg-accent",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isSelected && isTodayDate && "bg-accent font-bold ring-2 ring-primary",
                    !isCurrentMonth && "text-muted-foreground/40",
                    !isSelected && !isTodayDate && isCurrentMonth && "text-foreground"
                  )}
                >
                  <span className="flex items-center justify-center h-full">
                    {format(day, 'd')}
                  </span>
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                      <div className="w-1 h-1 rounded-full bg-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar Selector */}
        <CalendarSelector
          accountId={selectedAccount?.nylasGrantId || null}
          selectedCalendarIds={selectedCalendarIds}
          onCalendarSelectionChange={setSelectedCalendarIds}
        />

        {/* Upcoming Events */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {selectedMiniDate ? format(selectedMiniDate, "MMM d 'Events'") : 'Upcoming Events'}
            </h3>
            {selectedMiniDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMiniDate(null)}
                className="h-6 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {filteredEvents
              .filter(event => {
                const eventDate = new Date(event.startTime);
                if (selectedMiniDate) {
                  // Show only events for the selected date
                  return format(eventDate, 'yyyy-MM-dd') === format(selectedMiniDate, 'yyyy-MM-dd');
                } else {
                  // Show all upcoming events
                  return eventDate >= new Date();
                }
              })
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 10)
              .map((event) => {
                const eventDate = new Date(event.startTime);
                const isEventToday = isToday(eventDate);

                return (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "w-1 h-full rounded-full mt-1",
                        event.color === 'blue' && 'bg-blue-500',
                        event.color === 'green' && 'bg-green-500',
                        event.color === 'red' && 'bg-red-500',
                        event.color === 'purple' && 'bg-purple-500',
                        event.color === 'orange' && 'bg-orange-500',
                        event.color === 'pink' && 'bg-pink-500',
                        !event.color && 'bg-primary'
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {isEventToday ? 'Today' : format(eventDate, 'MMM d')} • {format(eventDate, 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}

            {filteredEvents.filter(e => {
              const eventDate = new Date(e.startTime);
              if (selectedMiniDate) {
                return format(eventDate, 'yyyy-MM-dd') === format(selectedMiniDate, 'yyyy-MM-dd');
              } else {
                return eventDate >= new Date();
              }
            }).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {selectedMiniDate ? `No events on ${format(selectedMiniDate, 'MMM d')}` : 'No upcoming events'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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
        onSuccess={fetchEvents}
      />

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
          setSelectedDate(null);
        }}
        event={selectedEvent}
        defaultDate={selectedDate || undefined}
        onSuccess={fetchEvents}
      />

      <QuickAdd
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onEventCreated={fetchEvents}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}
