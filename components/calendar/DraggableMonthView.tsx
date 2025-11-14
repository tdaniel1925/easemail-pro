/**
 * Draggable Month View
 * Month calendar with drag-and-drop event rescheduling
 */

'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Repeat, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { findConflictingEvents } from '@/lib/calendar/calendar-utils';

interface DraggableMonthViewProps {
  currentMonth: Date;
  events: any[];
  onMonthChange: (date: Date) => void;
  onEventMove: (eventId: string, newDate: Date) => void;
  onDayClick: (day: number) => void;
  onEventClick: (e: React.MouseEvent, event: any) => void;
}

function DraggableEvent({ event, allEvents }: { event: any; allEvents: any[] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: event,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const conflicts = findConflictingEvents(event, allEvents);
  const hasConflict = conflicts.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'text-xs px-1 py-0.5 rounded truncate cursor-move flex items-center gap-0.5',
        event.color === 'blue' && 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
        event.color === 'green' && 'bg-green-500/20 text-green-700 dark:text-green-300',
        event.color === 'red' && 'bg-red-500/20 text-red-700 dark:text-red-300',
        event.color === 'purple' && 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
        event.color === 'orange' && 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
        event.color === 'pink' && 'bg-pink-500/20 text-pink-700 dark:text-pink-300',
        isDragging && 'opacity-50',
        hasConflict && 'ring-1 ring-destructive/30'
      )}
    >
      {event.isRecurring && <Repeat className="h-2.5 w-2.5 flex-shrink-0" />}
      {hasConflict && <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 text-destructive" />}
      <span className="truncate">{event.title}</span>
    </div>
  );
}

function DroppableDay({ day, isToday, events, allEvents, onDayClick }: any) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${day.day}`,
    data: { date: day.date },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(day.day)}
      className={cn(
        'aspect-square border border-border rounded-sm p-2 cursor-pointer transition-colors overflow-hidden',
        isToday && 'bg-primary/10 border-primary',
        isOver && 'bg-accent border-primary ring-2 ring-primary ring-offset-2',
        !isOver && 'hover:bg-accent'
      )}
    >
      <div className={cn(
        'text-sm font-medium mb-1',
        isToday && 'text-primary font-bold'
      )}>
        {day.day}
      </div>
      <div className="space-y-0.5">
        {events.slice(0, 3).map((event: any) => (
          <DraggableEvent key={event.id} event={event} allEvents={allEvents} />
        ))}
        {events.length > 3 && (
          <div className="text-xs text-muted-foreground">
            +{events.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

export default function DraggableMonthView({
  currentMonth,
  events,
  onMonthChange,
  onEventMove,
  onDayClick,
  onEventClick,
}: DraggableMonthViewProps) {
  const [activeEvent, setActiveEvent] = useState<any>(null);

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
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();
  };

  const getEventsForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().split('T')[0];
    
    return events.filter(event => {
      const eventStart = parseISO(event.startTime);
      const eventDateStr = eventStart.toISOString().split('T')[0];
      return eventDateStr === dateStr;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!over || active.id === over.id) return;

    const eventId = active.id as string;
    const targetDay = over.data.current?.date as Date;

    if (targetDay) {
      onEventMove(eventId, targetDay);
    }
  };

  const handleDragStart = (event: any) => {
    setActiveEvent(event.active.data.current);
  };

  // Build days array
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return {
      day,
      date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
      events: getEventsForDay(day),
    };
  });

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    >
      <div className="p-6">
        {/* Month Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMonthChange(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }).map((_, index) => (
            <div key={`empty-${index}`} className="aspect-square" />
          ))}

          {/* Days with drag & drop */}
          {days.map((day) => (
            <DroppableDay
              key={day.day}
              day={day}
              isToday={isToday(day.day)}
              events={day.events}
              allEvents={events}
              onDayClick={onDayClick}
            />
          ))}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeEvent ? (
          <div className={cn(
            'px-2 py-1 rounded shadow-lg text-xs font-medium',
            activeEvent.color === 'blue' && 'bg-blue-500 text-white',
            activeEvent.color === 'green' && 'bg-green-500 text-white',
            activeEvent.color === 'red' && 'bg-red-500 text-white',
            activeEvent.color === 'purple' && 'bg-purple-500 text-white',
            activeEvent.color === 'orange' && 'bg-orange-500 text-white',
            activeEvent.color === 'pink' && 'bg-pink-500 text-white'
          )}>
            {activeEvent.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

