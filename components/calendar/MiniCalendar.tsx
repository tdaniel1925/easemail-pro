'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color?: string;
}

export function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

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

  // Fetch events for current month
  const fetchEvents = async () => {
    try {
      setLoading(true);
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

  // Get upcoming events (next 7 days)
  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.startTime);
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return eventDate >= now && eventDate <= weekFromNow;
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);

  // Check if a day has events
  const dayHasEvents = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    return events.some(event => {
      const eventStart = new Date(event.startTime);
      return eventStart.toISOString().split('T')[0] === dateStr;
    });
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

        {/* Upcoming Events */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Upcoming</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={() => {
                // Navigate to calendar page
                window.location.href = '/calendar';
              }}
            >
              View All
            </Button>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                Loading...
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                No upcoming events
              </div>
            ) : (
              upcomingEvents.map((event) => {
                const eventDate = new Date(event.startTime);
                const isEventToday = eventDate.toDateString() === new Date().toDateString();
                const isTomorrow = eventDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                
                let timeLabel = '';
                if (isEventToday) {
                  timeLabel = `Today ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                } else if (isTomorrow) {
                  timeLabel = `Tomorrow ${eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                } else {
                  timeLabel = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                }

                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
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
                      <p className="text-xs font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-3 border-t border-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleNewEvent}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Event
          </Button>
        </div>
      </div>
    </div>
  );
}


