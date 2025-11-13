'use client';

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import EventModal from '@/components/calendar/EventModal';
import WeekView from '@/components/calendar/WeekView';
import DayView from '@/components/calendar/DayView';
import AgendaView from '@/components/calendar/AgendaView';
import DraggableMonthView from '@/components/calendar/DraggableMonthView';
import QuickAdd from '@/components/calendar/QuickAdd';
import { cn } from '@/lib/utils';

type ViewType = 'month' | 'week' | 'day' | 'agenda';

function CalendarContent() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
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

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  // Fetch events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Get first and last day of current month
      const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      
      const response = await fetch(
        `/api/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

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

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    return events.filter(event => {
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
    setSelectedDate(null);
    setIsEventModalOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setIsEventModalOpen(true);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Get user's email accounts
      const accountsResponse = await fetch('/api/nylas/accounts');
      const accountsData = await accountsResponse.json();
      
      if (accountsData.accounts && accountsData.accounts.length > 0) {
        // Sync with first account (you can enhance this to sync all accounts)
        const account = accountsData.accounts[0];
        
        if (account.emailProvider === 'gmail' || account.nylasProvider === 'google') {
          await fetch('/api/calendar/sync/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: account.id }),
          });
        } else if (account.emailProvider === 'outlook' || account.nylasProvider === 'microsoft') {
          await fetch('/api/calendar/sync/microsoft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: account.id }),
          });
        }
        
        // Refresh events
        await fetchEvents();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleEventMove = async (eventId: string, newDate: Date) => {
    try {
      // Find the event
      const event = events.find(e => e.id === eventId);
      if (!event) return;

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

      const data = await response.json();

      if (data.success) {
        // Refresh events
        await fetchEvents();
      } else {
        console.error('Failed to move event:', data.error);
      }
    } catch (error) {
      console.error('Error moving event:', error);
    }
  };

  return (
    <div className="flex w-full h-screen bg-background">
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Calendar Card */}
        <div className="flex-1 bg-card border border-border rounded-lg overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {view === 'month' && (
                <DraggableMonthView
                  currentMonth={currentMonth}
                  events={events}
                  onMonthChange={setCurrentMonth}
                  onEventMove={handleEventMove}
                  onDayClick={handleDayClick}
                  onEventClick={handleEventClick}
                />
              )}

              {view === 'week' && (
                <WeekView
                  events={events}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                    setSelectedDate(null);
                    setIsEventModalOpen(true);
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
                  events={events}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                    setSelectedDate(null);
                    setIsEventModalOpen(true);
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
                  events={events}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                    setSelectedDate(null);
                    setIsEventModalOpen(true);
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Event Modal */}
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
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <CalendarContent />
    </Suspense>
  );
}

