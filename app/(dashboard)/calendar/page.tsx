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
import DayEventsModal from '@/components/calendar/DayEventsModal';
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
import { transformNylasEvent } from '@/lib/calendar/event-utils';

type ViewType = 'month' | 'week' | 'day' | 'agenda' | 'year' | 'list';

function CalendarContent() {
  const { selectedAccount } = useAccount();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // View State with localStorage persistence
  const [view, setView] = useState<ViewType>(() => {
    // Load saved view preference from localStorage
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('calendar-default-view');
      if (savedView && ['month', 'week', 'day', 'year', 'agenda', 'list'].includes(savedView)) {
        return savedView as ViewType;
      }
    }
    return 'month';
  });
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
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayModalDate, setDayModalDate] = useState<Date | null>(null);
  const [dayModalClickedTime, setDayModalClickedTime] = useState<string | undefined>(undefined);

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

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return baseEvents.filter(event => {
      // Filter by calendar type
      const eventType = event.calendarType || 'personal';
      if (!selectedCalendarTypes.includes(eventType)) return false;

      // Filter out past events (events that ended before today)
      try {
        let eventEndTime: Date;

        if (event.endTime) {
          eventEndTime = new Date(event.endTime);
        } else if (event.when?.endTime) {
          eventEndTime = new Date(event.when.endTime * 1000);
        } else if (event.when?.date) {
          // All-day event - include if it's today or future
          const eventDate = new Date(event.when.date);
          return eventDate >= startOfToday;
        } else {
          return true; // Include if we can't determine the end time
        }

        // Only show events that haven't ended yet
        return eventEndTime >= startOfToday;
      } catch (err) {
        console.error('Error filtering past event:', err, event);
        return true; // Include events with parsing errors
      }
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
        const errorData = await response.json().catch(() => ({}));
        console.error('[Calendar] API Error:', response.status, errorData);

        if (response.status === 403) {
          throw new Error('Account access denied. Please reconnect your email account in Settings.');
        } else if (response.status === 404) {
          throw new Error('Calendar account not found. Please reconnect your email account in Settings.');
        } else if (response.status === 400) {
          throw new Error('Calendar account not properly connected. Please reconnect in Settings.');
        }
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Transform Nylas events to calendar component format
        const transformedEvents = (data.events || [])
          .map((event: any) => transformNylasEvent(event))
          .filter((event: any) => event !== null); // Remove events that couldn't be transformed

        console.log('[Calendar] Transformed events:', transformedEvents.length);
        if (transformedEvents.length > 0) {
          console.log('[Calendar] Sample transformed event:', {
            id: transformedEvents[0].id,
            title: transformedEvents[0].title,
            startTime: transformedEvents[0].startTime,
            endTime: transformedEvents[0].endTime,
            when: transformedEvents[0].when,
          });
        }

        if (transformedEvents.length < (data.events || []).length) {
          console.warn(`[Calendar] Filtered out ${(data.events || []).length - transformedEvents.length} events that couldn't be transformed`);
        }

        setEvents(transformedEvents);
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
  const handleSync = async (silent = false) => {
    if (!selectedAccount?.nylasGrantId) {
      if (!silent) {
        toast({
          title: 'No Account Selected',
          description: 'Please select an account to sync.',
          variant: 'destructive',
        });
      }
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
        if (!silent) {
          toast({
            title: 'Sync Complete',
            description: `Successfully synced ${data.synced || 0} events`,
          });
        }
        await fetchEvents();
        console.log('[Auto-Sync] Successfully synced calendar');
      } else {
        if (!silent) {
          toast({
            title: 'Sync Failed',
            description: data.error || 'Failed to sync calendar',
            variant: 'destructive',
          });
        }
        console.error('[Auto-Sync] Sync failed:', data.error);
      }
    } catch (error) {
      console.error('[Auto-Sync] Sync failed:', error);
      if (!silent) {
        toast({
          title: 'Sync Failed',
          description: 'An error occurred while syncing',
          variant: 'destructive',
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  // ✅ OUTLOOK BEHAVIOR: Auto-sync calendar every 3 minutes
  useEffect(() => {
    if (!selectedAccount?.nylasGrantId) return;

    console.log('[Auto-Sync] Starting auto-sync interval (every 3 minutes)');

    // Auto-sync every 3 minutes (180,000 ms)
    const syncInterval = setInterval(() => {
      console.log('[Auto-Sync] Running scheduled sync...');
      handleSync(true); // Silent sync (no toast notifications)
    }, 3 * 60 * 1000);

    // Cleanup interval on unmount or account change
    return () => {
      console.log('[Auto-Sync] Clearing auto-sync interval');
      clearInterval(syncInterval);
    };
  }, [selectedAccount?.nylasGrantId]);

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
    setDayModalDate(date);
    setDayModalClickedTime(undefined);
    setIsDayModalOpen(true);
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
      } catch (err) {
        console.error('Error parsing event date:', err, event);
        return false;
      }
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
                  onClick={() => handleSync(false)}
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
                    onClick={() => {
                      setView(v);
                      // Save preference to localStorage
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('calendar-default-view', v);
                      }
                    }}
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
                    setDayModalDate(date);
                    setDayModalClickedTime(`${hour}:00`);
                    setIsDayModalOpen(true);
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
                    setDayModalDate(date);
                    setDayModalClickedTime(`${hour}:00`);
                    setIsDayModalOpen(true);
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
                try {
                  // Parse event date from Nylas v3 format
                  let eventStartTime;
                  if (event.when?.startTime) {
                    eventStartTime = new Date(event.when.startTime * 1000);
                  } else if (event.when?.date) {
                    eventStartTime = new Date(event.when.date);
                  } else if (event.startTime) {
                    eventStartTime = new Date(event.startTime);
                  } else {
                    return false;
                  }

                  if (selectedMiniDate) {
                    // Show only events for the selected date
                    return format(eventStartTime, 'yyyy-MM-dd') === format(selectedMiniDate, 'yyyy-MM-dd');
                  } else {
                    // Show all upcoming events
                    return eventStartTime >= new Date();
                  }
                } catch (err) {
                  console.error('Error filtering event:', err, event);
                  return false;
                }
              })
              .sort((a, b) => {
                const getTime = (event: any) => {
                  if (event.when?.startTime) return event.when.startTime * 1000;
                  if (event.when?.date) return new Date(event.when.date).getTime();
                  if (event.startTime) return new Date(event.startTime).getTime();
                  return 0;
                };
                return getTime(a) - getTime(b);
              })
              .slice(0, 10)
              .map((event) => {
                // Parse event date
                let eventDate;
                if (event.when?.startTime) {
                  eventDate = new Date(event.when.startTime * 1000);
                } else if (event.when?.date) {
                  eventDate = new Date(event.when.date);
                } else if (event.startTime) {
                  eventDate = new Date(event.startTime);
                } else {
                  eventDate = new Date();
                }
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
              try {
                let eventStartTime;
                if (e.when?.startTime) {
                  eventStartTime = new Date(e.when.startTime * 1000);
                } else if (e.when?.date) {
                  eventStartTime = new Date(e.when.date);
                } else if (e.startTime) {
                  eventStartTime = new Date(e.startTime);
                } else {
                  return false;
                }

                if (selectedMiniDate) {
                  return format(eventStartTime, 'yyyy-MM-dd') === format(selectedMiniDate, 'yyyy-MM-dd');
                } else {
                  return eventStartTime >= new Date();
                }
              } catch (err) {
                return false;
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
      <DayEventsModal
        isOpen={isDayModalOpen}
        onClose={() => {
          setIsDayModalOpen(false);
          setDayModalDate(null);
          setDayModalClickedTime(undefined);
        }}
        date={dayModalDate || new Date()}
        events={dayModalDate ? getEventsForDate(dayModalDate) : []}
        onEventClick={(event) => {
          setSelectedEvent(event);
          setIsEventDetailsOpen(true);
        }}
        onAddEvent={(prefilledData) => {
          setIsDayModalOpen(false);
          setSelectedDate(prefilledData?.date || new Date());
          // If a specific time was clicked, set the hour
          if (dayModalClickedTime) {
            const [hour] = dayModalClickedTime.split(':').map(Number);
            const dateWithTime = new Date(prefilledData?.date || new Date());
            dateWithTime.setHours(hour);
            setSelectedDate(dateWithTime);
          }
          setSelectedEvent(null);
          setIsEventModalOpen(true);
        }}
      />

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
