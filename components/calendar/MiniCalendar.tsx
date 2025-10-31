'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Event {
  id: string;
  title: string;
  time: string;
  date: Date;
  color?: string;
}

export function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Mock events for demo
  const upcomingEvents: Event[] = [
    {
      id: '1',
      title: 'Team Meeting',
      time: '2:00 PM',
      date: new Date(),
      color: 'bg-blue-500'
    },
    {
      id: '2',
      title: 'Project Review',
      time: '4:30 PM',
      date: new Date(),
      color: 'bg-purple-500'
    },
    {
      id: '3',
      title: 'Client Call',
      time: 'Tomorrow 10:00 AM',
      date: new Date(Date.now() + 86400000),
      color: 'bg-green-500'
    }
  ];

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

            return (
              <button
                key={day}
                onClick={() => {
                  setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                }}
                className={cn(
                  'aspect-square rounded-md text-xs font-medium transition-colors flex items-center justify-center',
                  todayDate && 'bg-primary text-primary-foreground hover:bg-primary/90',
                  !todayDate && selected && 'bg-accent',
                  !todayDate && !selected && 'hover:bg-accent/50'
                )}
              >
                {day}
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
              onClick={() => window.location.href = '/calendar'}
            >
              View All
            </Button>
          </div>

          <div className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">
                No upcoming events
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className={cn('w-1 h-full rounded-full flex-shrink-0 mt-0.5', event.color || 'bg-primary')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{event.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-[10px] text-muted-foreground">{event.time}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-3 border-t border-border space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => {
              // TODO: Open create event modal
              console.log('Create new event');
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Event
          </Button>
        </div>
      </div>
    </div>
  );
}

