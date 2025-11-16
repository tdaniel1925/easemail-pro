/**
 * Draggable Month View
 * Month calendar with drag-and-drop event rescheduling
 */

'use client';

import { useState, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, closestCenter } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Repeat, AlertTriangle, GripVertical, Clock } from 'lucide-react';
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

function DraggableEvent({ event, allEvents, onEventClick }: { event: any; allEvents: any[]; onEventClick: (e: React.MouseEvent, event: any) => void }) {
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEventClick(e, event);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'text-xs px-1 py-0.5 rounded truncate flex items-center gap-0.5 group relative',
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
      {/* Drag Handle - only this part triggers drag */}
      <div
        {...listeners}
        {...attributes}
        className="cursor-move opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Drag to move event"
      >
        <GripVertical className="h-3 w-3" />
      </div>

      {/* Clickable Event Content */}
      <div
        onClick={handleClick}
        className="flex-1 flex items-center gap-0.5 cursor-pointer hover:opacity-80 truncate"
      >
        {event.isRecurring && <Repeat className="h-2.5 w-2.5 flex-shrink-0" />}
        {hasConflict && <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0 text-destructive" />}
        <span className="truncate">{event.title}</span>
      </div>
    </div>
  );
}

function DroppableDay({ day, isToday, events, allEvents, onDayClick, onEventClick, onDayMouseEnter, onDayMouseLeave }: any) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${day.day}`,
    data: { date: day.date },
  });

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (events.length > 0) {
      onDayMouseEnter(day.day, e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(day.day)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onDayMouseLeave}
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
          <DraggableEvent key={event.id} event={event} allEvents={allEvents} onEventClick={onEventClick} />
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
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

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

  // Handle mouse enter on day cell
  const handleDayMouseEnter = (day: number, event: React.MouseEvent<HTMLDivElement>) => {
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length === 0) return;

    const cell = event.currentTarget;
    const rect = cell.getBoundingClientRect();
    const calendarRect = calendarRef.current?.getBoundingClientRect();

    if (calendarRect) {
      // Estimated popup dimensions
      const popupWidth = 320; // Larger for main calendar
      const popupHeight = Math.min(dayEvents.length * 70 + 60, 400); // Estimate based on events
      const gap = 8;
      const padding = 16;

      // Get viewport dimensions
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Calculate initial position (below the day cell, relative to calendar container)
      let top = rect.bottom - calendarRect.top + gap;
      let left = rect.left - calendarRect.left;

      // Check if popup would overflow the viewport
      const popupBottomInViewport = rect.bottom + gap + popupHeight;
      const popupRightInViewport = rect.left + popupWidth;

      // Adjust vertical position if popup would overflow viewport bottom
      if (popupBottomInViewport > viewportHeight) {
        // Try positioning above the day cell instead
        const topPosition = rect.top - calendarRect.top - popupHeight - gap;
        if (topPosition >= padding && rect.top - popupHeight - gap > 0) {
          top = topPosition;
        } else {
          // Position it at the bottom of the visible area
          top = viewportHeight - calendarRect.top - popupHeight - padding;
        }
      }

      // Adjust horizontal position if popup would overflow viewport right
      if (popupRightInViewport > viewportWidth) {
        const overflow = popupRightInViewport - viewportWidth + padding;
        left = Math.max(padding, left - overflow);
      }

      // Ensure popup doesn't go beyond left edge
      if (left < padding) {
        left = padding;
      }

      // Ensure popup doesn't go beyond top edge
      if (top < padding) {
        top = padding;
      }

      setHoveredDay(day);
      setPopupPosition({
        top,
        left,
      });
    }
  };

  // Handle mouse leave
  const handleDayMouseLeave = () => {
    setHoveredDay(null);
    setPopupPosition(null);
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
        <div ref={calendarRef} className="grid grid-cols-7 gap-2 relative">
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
              onEventClick={onEventClick}
              onDayMouseEnter={handleDayMouseEnter}
              onDayMouseLeave={handleDayMouseLeave}
            />
          ))}

          {/* Hover Popup */}
          {hoveredDay !== null && popupPosition && (
            <div
              className="absolute z-50 min-w-[280px] max-w-[320px] bg-popover border border-border rounded-lg shadow-lg p-4"
              style={{
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
              }}
              onMouseEnter={() => setHoveredDay(hoveredDay)}
              onMouseLeave={handleDayMouseLeave}
            >
              <div className="mb-3">
                <p className="text-sm font-semibold text-foreground">
                  {monthNames[currentMonth.getMonth()]} {hoveredDay}, {currentMonth.getFullYear()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getEventsForDay(hoveredDay).length} {getEventsForDay(hoveredDay).length === 1 ? 'event' : 'events'}
                </p>
              </div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {getEventsForDay(hoveredDay).map((event) => {
                  const startTime = parseISO(event.startTime);
                  const endTime = parseISO(event.endTime);
                  const timeStr = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`;

                  return (
                    <div
                      key={event.id}
                      className="flex items-start gap-2 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer border border-border/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDayMouseLeave();
                        onEventClick(e, event);
                      }}
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
                        <p className="text-sm font-medium text-foreground mb-0.5">{event.title}</p>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{timeStr}</p>
                        </div>
                        {event.location && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{event.location}</p>
                        )}
                        {event.isRecurring && (
                          <div className="flex items-center gap-1 mt-1">
                            <Repeat className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Recurring</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

