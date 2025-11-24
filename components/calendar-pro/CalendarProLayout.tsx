'use client';

import { useState, useMemo } from 'react';
import { useCalendarPro } from '@/contexts/CalendarProContext';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Settings,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isToday, startOfDay, endOfDay } from 'date-fns';
import DayView from './views/DayView';
import WeekView from './views/WeekView';
import MonthView from './views/MonthView';
import QuickAdd from './QuickAdd';
import EventDetailModal from './EventDetailModal';
import { useAccount } from '@/contexts/AccountContext';
import AccountSwitcher from '@/components/account/AccountSwitcher';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import Link from 'next/link';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export default function CalendarProLayout() {
  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    selectedEvent,
    setSelectedEvent,
    calendars,
    selectedCalendarIds,
    toggleCalendar,
    refreshEvents,
    isLoadingEvents,
    events,
  } = useCalendarPro();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddInitialTime, setQuickAddInitialTime] = useState<{ hour: number; minute: number } | undefined>();
  const [showMiniCalendar, setShowMiniCalendar] = useState(true);
  const [todayPopoverOpen, setTodayPopoverOpen] = useState(false);

  // Function to open QuickAdd with a specific time
  const openQuickAddWithTime = (hour: number, minute: number) => {
    setQuickAddInitialTime({ hour, minute });
    setQuickAddOpen(true);
  };

  // Get today's events
  const todaysEvents = useMemo(() => {
    const today = new Date();
    const todayStart = startOfDay(today).getTime() / 1000;
    const todayEnd = endOfDay(today).getTime() / 1000;

    return events.filter(event => {
      const eventStart = event.start_time;
      const eventEnd = event.end_time;
      return (eventStart >= todayStart && eventStart < todayEnd) ||
             (eventEnd > todayStart && eventEnd <= todayEnd) ||
             (eventStart < todayStart && eventEnd > todayEnd);
    }).sort((a, b) => a.start_time - b.start_time);
  }, [events]);

  // Get formatted date range for header
  const getDateRangeText = () => {
    if (viewMode === 'day') {
      return format(selectedDate, 'EEEE, MMMM d, yyyy');
    } else if (viewMode === 'week') {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(selectedDate.getDate() - selectedDate.getDay());
      const weekEnd = addDays(weekStart, 6);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    } else {
      return format(selectedDate, 'MMMM yyyy');
    }
  };

  // Navigation
  const goToPrevious = () => {
    if (viewMode === 'day') {
      setSelectedDate(subDays(selectedDate, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === 'day') {
      setSelectedDate(addDays(selectedDate, 1));
    } else if (viewMode === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'j',
      handler: () => {
        if (viewMode === 'day') setSelectedDate(addDays(selectedDate, 1));
      },
      description: 'Next day',
    },
    {
      key: 'k',
      handler: () => {
        if (viewMode === 'day') setSelectedDate(subDays(selectedDate, 1));
      },
      description: 'Previous day',
    },
    {
      key: 'h',
      handler: () => {
        if (viewMode === 'week') setSelectedDate(subWeeks(selectedDate, 1));
      },
      description: 'Previous week',
    },
    {
      key: 'l',
      handler: () => {
        if (viewMode === 'week') setSelectedDate(addWeeks(selectedDate, 1));
      },
      description: 'Next week',
    },
    {
      key: 'd',
      handler: () => setViewMode('day'),
      description: 'Day view',
    },
    {
      key: 'w',
      handler: () => setViewMode('week'),
      description: 'Week view',
    },
    {
      key: 'm',
      handler: () => setViewMode('month'),
      description: 'Month view',
    },
    {
      key: 'n',
      handler: () => setQuickAddOpen(true),
      description: 'New event',
    },
    {
      key: 't',
      handler: goToToday,
      description: 'Go to today',
    },
  ]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex-shrink-0 border-b border-border bg-background">
        <div className="h-14 px-4 flex items-center justify-between gap-4">
          {/* Left: Navigation */}
          <div className="flex items-center gap-2">
            <Link href="/inbox">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Inbox
              </Button>
            </Link>

            <div className="h-6 w-px bg-border mx-2" />

            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              title="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              title="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <Popover open={todayPopoverOpen} onOpenChange={setTodayPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2"
                >
                  Today
                  {todaysEvents.length > 0 && (
                    <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {todaysEvents.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Today's Events</h4>
                  {todaysEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events today</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {todaysEvents.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setTodayPopoverOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-1 h-full rounded-full"
                              style={{ backgroundColor: event.calendar?.hex_color || '#6366f1' }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{event.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(event.start_time * 1000), 'h:mm a')}
                                {' - '}
                                {format(new Date(event.end_time * 1000), 'h:mm a')}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      goToToday();
                      setViewMode('day');
                      setTodayPopoverOpen(false);
                    }}
                  >
                    Go to Today
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <div className="ml-4 text-lg font-semibold">
              {getDateRangeText()}
            </div>
          </div>

          {/* Center: View switcher */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshEvents}
              disabled={isLoadingEvents}
              title="Refresh"
            >
              <RefreshCw className={cn('h-5 w-5', isLoadingEvents && 'animate-spin')} />
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => setQuickAddOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>

            <AccountSwitcher />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mini Calendar Sidebar (Optional) */}
        {showMiniCalendar && (
          <div className="w-64 border-r border-border bg-background overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold mb-3">Calendars</h3>
              <div className="space-y-2">
                {calendars.map((calendar) => (
                  <label
                    key={calendar.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded p-2 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCalendarIds.includes(calendar.id)}
                      onChange={() => toggleCalendar(calendar.id)}
                      className="rounded"
                    />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: calendar.hexColor || '#3b82f6' }}
                    />
                    <span className="text-sm flex-1 truncate">{calendar.name}</span>
                  </label>
                ))}
              </div>

              {/* Keyboard shortcuts help */}
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                  Keyboard Shortcuts
                </h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>New event</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Today</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">T</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Day view</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">D</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Week view</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">W</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Month view</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Command palette</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘K</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar View */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === 'day' && <DayView onTimeSlotClick={openQuickAddWithTime} />}
          {viewMode === 'week' && <WeekView onTimeSlotClick={openQuickAddWithTime} />}
          {viewMode === 'month' && <MonthView />}
        </div>
      </div>

      {/* Modals */}
      <QuickAdd open={quickAddOpen} onOpenChange={setQuickAddOpen} initialTime={quickAddInitialTime} />
      <EventDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </div>
  );
}
