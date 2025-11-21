/**
 * Day Events Modal Component
 * Shows all events for a selected day in a scrollable list with enhanced features:
 * - Event grouping by time of day
 * - Time gap indicators
 * - Day summary statistics
 * - Quick add event button
 */

'use client';

import { format, parseISO, differenceInMinutes, isSameDay } from 'date-fns';
import { Calendar, Clock, MapPin, Users, Plus, X, TrendingUp, Trash2, CheckSquare, Square } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CalendarEvent } from '@/lib/calendar/calendar-utils';
import { useState } from 'react';

// Utility to strip HTML tags and decode HTML entities
function sanitizeEventText(text: string | undefined | null): string {
  if (!text) return '';
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const decoded = doc.documentElement.textContent || '';
  return decoded.replace(/<[^>]*>/g, '').trim();
}

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onAddEvent: (prefilledData?: { date: Date; time?: string }) => void;
  onBulkDelete?: (eventIds: string[]) => Promise<void>;
}

interface TimeGroup {
  label: string;
  period: string;
  events: CalendarEvent[];
  color: string;
}

export default function DayEventsModal({
  isOpen,
  onClose,
  date,
  events,
  onEventClick,
  onAddEvent,
  onBulkDelete,
}: DayEventsModalProps) {
  // Bulk delete state
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => {
    // All-day events first
    if (a.allDay && !b.allDay) return -1;
    if (!a.allDay && b.allDay) return 1;

    const aTime = new Date(a.startTime).getTime();
    const bTime = new Date(b.startTime).getTime();
    return aTime - bTime;
  });

  // Handle checkbox toggle
  const handleToggleEvent = (eventId: string) => {
    const newSelected = new Set(selectedEventIds);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEventIds(newSelected);
  };

  // Select all events
  const handleSelectAll = () => {
    if (selectedEventIds.size === events.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(events.map(e => e.id)));
    }
  };

  // Show bulk delete confirmation
  const handleBulkDeleteClick = () => {
    if (!onBulkDelete || selectedEventIds.size === 0) return;
    setShowDeleteConfirm(true);
  };

  // Confirm bulk delete
  const handleBulkDeleteConfirm = async () => {
    if (!onBulkDelete || selectedEventIds.size === 0) return;

    try {
      setIsDeleting(true);
      await onBulkDelete(Array.from(selectedEventIds));
      setSelectedEventIds(new Set());
      setSelectionMode(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete events:', error);
      alert('Failed to delete events. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel bulk delete
  const handleBulkDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  // Exit selection mode and clear selection
  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedEventIds(new Set());
  };

  // Reset selection when modal closes
  const handleClose = () => {
    setSelectionMode(false);
    setSelectedEventIds(new Set());
    onClose();
  };

  // Group events by time of day
  const groupEventsByTime = (): TimeGroup[] => {
    const groups: TimeGroup[] = [
      { label: 'All Day', period: 'all-day', events: [], color: 'text-purple-500' },
      { label: 'Morning', period: '6am - 12pm', events: [], color: 'text-amber-500' },
      { label: 'Afternoon', period: '12pm - 5pm', events: [], color: 'text-blue-500' },
      { label: 'Evening', period: '5pm - 9pm', events: [], color: 'text-indigo-500' },
      { label: 'Night', period: '9pm+', events: [], color: 'text-slate-500' },
    ];

    sortedEvents.forEach(event => {
      if (event.allDay) {
        groups[0].events.push(event);
        return;
      }

      const startHour = new Date(event.startTime).getHours();

      if (startHour >= 6 && startHour < 12) {
        groups[1].events.push(event);
      } else if (startHour >= 12 && startHour < 17) {
        groups[2].events.push(event);
      } else if (startHour >= 17 && startHour < 21) {
        groups[3].events.push(event);
      } else {
        groups[4].events.push(event);
      }
    });

    return groups.filter(group => group.events.length > 0);
  };

  const timeGroups = groupEventsByTime();

  // Calculate day statistics
  const calculateDayStats = () => {
    const timedEvents = sortedEvents.filter(e => !e.allDay);

    if (timedEvents.length === 0) {
      return {
        totalMeetingMinutes: 0,
        totalMeetingTime: '0m',
        freeTime: '16h',
        busyPercentage: 0,
        density: 'light' as const,
        densityColor: 'bg-green-500',
        densityText: 'Light day',
      };
    }

    // Calculate total meeting time
    const totalMeetingMinutes = timedEvents.reduce((total, event) => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      return total + differenceInMinutes(end, start);
    }, 0);

    // Assume workday is 8am-6pm (10 hours = 600 minutes)
    const workdayMinutes = 600;
    const busyPercentage = Math.min((totalMeetingMinutes / workdayMinutes) * 100, 100);

    // Determine density
    let density: 'light' | 'moderate' | 'busy' | 'packed';
    let densityColor: string;
    let densityText: string;

    if (events.length <= 3) {
      density = 'light';
      densityColor = 'bg-green-500';
      densityText = 'Light day';
    } else if (events.length <= 6) {
      density = 'moderate';
      densityColor = 'bg-yellow-500';
      densityText = 'Moderate';
    } else if (events.length <= 9) {
      density = 'busy';
      densityColor = 'bg-orange-500';
      densityText = 'Busy';
    } else {
      density = 'packed';
      densityColor = 'bg-red-500';
      densityText = 'Packed';
    }

    const hours = Math.floor(totalMeetingMinutes / 60);
    const minutes = totalMeetingMinutes % 60;
    const totalMeetingTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const freeMinutes = workdayMinutes - totalMeetingMinutes;
    const freeHours = Math.floor(freeMinutes / 60);
    const freeMinutesRemainder = freeMinutes % 60;
    const freeTime = freeHours > 0 ? `${freeHours}h ${freeMinutesRemainder}m` : `${freeMinutesRemainder}m`;

    return {
      totalMeetingMinutes,
      totalMeetingTime,
      freeTime,
      busyPercentage,
      density,
      densityColor,
      densityText,
    };
  };

  const stats = calculateDayStats();

  // Calculate time gaps between events
  const getTimeGap = (currentEvent: CalendarEvent, nextEvent: CalendarEvent | undefined): number | null => {
    if (!nextEvent || currentEvent.allDay || nextEvent.allDay) return null;

    const currentEnd = new Date(currentEvent.endTime);
    const nextStart = new Date(nextEvent.startTime);
    const gapMinutes = differenceInMinutes(nextStart, currentEnd);

    return gapMinutes > 0 ? gapMinutes : null;
  };

  const formatTimeGap = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min free`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m free` : `${hours}h free`;
  };

  const isToday = isSameDay(date, new Date());
  const dateLabel = isToday ? 'Today' : format(date, 'EEEE, MMMM d, yyyy');

  // Check if date is in the past (before today's start)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isPastDate = date < today;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{dateLabel}</DialogTitle>

              {/* Day Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {events.length} {events.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                {stats.totalMeetingMinutes > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{stats.totalMeetingTime} of meetings</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{stats.freeTime} free</span>
                    </div>
                  </>
                )}

                {/* Density Badge */}
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium text-white",
                  stats.densityColor
                )}>
                  {stats.densityText}
                </div>
              </div>

              {/* Busy Percentage Bar */}
              {stats.totalMeetingMinutes > 0 && (
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={cn("h-full transition-all", stats.densityColor)}
                      style={{ width: `${stats.busyPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Bulk Delete Toolbar */}
          {events.length > 0 && onBulkDelete && (
            <div className="mt-4 flex items-center gap-3">
              {!selectionMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  className="flex items-center gap-2"
                >
                  <CheckSquare className="h-4 w-4" />
                  Select Events
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="flex items-center gap-2"
                  >
                    {selectedEventIds.size === events.length ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <CheckSquare className="h-4 w-4" />
                    )}
                    {selectedEventIds.size === events.length ? 'Deselect All' : 'Select All'}
                  </Button>

                  {selectedEventIds.size > 0 && !showDeleteConfirm && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDeleteClick}
                      disabled={isDeleting}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isDeleting ? 'Deleting...' : `Delete ${selectedEventIds.size} event${selectedEventIds.size > 1 ? 's' : ''}`}
                    </Button>
                  )}

                  {/* Delete Confirmation Buttons */}
                  {showDeleteConfirm && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                        Delete {selectedEventIds.size} event{selectedEventIds.size > 1 ? 's' : ''}?
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDeleteConfirm}
                        disabled={isDeleting}
                        className="flex items-center gap-2"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDeleteCancel}
                        disabled={isDeleting}
                      >
                        Cancel
                      </Button>
                    </>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelSelection}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>

                  <div className="flex-1" />
                  <span className="text-sm text-muted-foreground">
                    {selectedEventIds.size} of {events.length} selected
                  </span>
                </>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Scrollable Events List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No events scheduled</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Click the + button to add your first event
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {timeGroups.map((group, groupIndex) => (
                <div key={group.label} className="space-y-3">
                  {/* Time Group Header */}
                  <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-2 z-10">
                    <div className={cn("font-semibold", group.color)}>
                      {group.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {group.period}
                    </div>
                    <div className="flex-1 border-b border-border" />
                    <div className="text-xs text-muted-foreground">
                      {group.events.length} {group.events.length === 1 ? 'event' : 'events'}
                    </div>
                  </div>

                  {/* Events in Group */}
                  <div className="space-y-2">
                    {group.events.map((event, eventIndex) => {
                      const nextEvent = group.events[eventIndex + 1];
                      const timeGap = getTimeGap(event, nextEvent);

                      return (
                        <div key={event.id}>
                          {/* Event Card */}
                          <div
                            onClick={() => selectionMode ? handleToggleEvent(event.id) : onEventClick(event)}
                            className={cn(
                              "group p-4 rounded-lg border cursor-pointer transition-all",
                              selectionMode && selectedEventIds.has(event.id)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50 hover:bg-accent/50"
                            )}
                          >
                            <div className="flex gap-4">
                              {/* Checkbox for selection mode */}
                              {selectionMode && (
                                <div className="flex items-center">
                                  <Checkbox
                                    checked={selectedEventIds.has(event.id)}
                                    onCheckedChange={() => handleToggleEvent(event.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              )}

                              {/* Time */}
                              {!event.allDay && (
                                <div className="flex-shrink-0 w-20 text-sm">
                                  <div className="font-medium">
                                    {format(new Date(event.startTime), 'h:mm a')}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {format(new Date(event.endTime), 'h:mm a')}
                                  </div>
                                </div>
                              )}

                              {/* Color Bar */}
                              <div className={cn(
                                'w-1 rounded-full flex-shrink-0',
                                event.color === 'blue' && 'bg-blue-500',
                                event.color === 'green' && 'bg-green-500',
                                event.color === 'red' && 'bg-red-500',
                                event.color === 'purple' && 'bg-purple-500',
                                event.color === 'orange' && 'bg-orange-500',
                                event.color === 'pink' && 'bg-pink-500',
                                !event.color && 'bg-primary'
                              )} />

                              {/* Event Details */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors">
                                  {sanitizeEventText(event.title)}
                                </h3>

                                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                  {event.location && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span className="truncate">{sanitizeEventText(event.location)}</span>
                                    </div>
                                  )}

                                  {event.attendees && event.attendees.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3.5 w-3.5" />
                                      <span>{event.attendees.length} attendees</span>
                                    </div>
                                  )}

                                  {event.isRecurring && (
                                    <div className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">
                                      Recurring
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Time Gap Indicator */}
                          {timeGap && timeGap >= 15 && (
                            <div className="flex items-center justify-center my-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                                <div className="w-8 border-t border-dashed border-muted-foreground/30" />
                                <Clock className="h-3 w-3" />
                                <span>{formatTimeGap(timeGap)}</span>
                                <div className="w-8 border-t border-dashed border-muted-foreground/30" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating Add Event Button - Only show for today and future dates */}
        {!isPastDate && (
          <div className="absolute bottom-6 right-6">
            <Button
              onClick={() => onAddEvent({ date })}
              size="lg"
              className="rounded-full shadow-lg h-14 w-14 p-0"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
