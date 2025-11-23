'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarEvent, useCalendarPro } from '@/contexts/CalendarProContext';
import { format } from 'date-fns';
import { Clock, MapPin, Users, Video, Trash2, Edit, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EventDetailModal({ event, open, onOpenChange }: EventDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { grantId, refreshEvents } = useCalendarPro();

  if (!event) return null;

  // Parse event time
  const getEventTime = () => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (event.when?.startTime) {
      startDate = new Date(event.when.startTime * 1000);
    } else if (event.when?.date) {
      startDate = new Date(event.when.date);
    } else if (event.startTime) {
      startDate = new Date(event.startTime);
    } else if (event.start_time) {
      startDate = new Date(event.start_time);
    }

    if (event.when?.endTime) {
      endDate = new Date(event.when.endTime * 1000);
    } else if (event.endTime) {
      endDate = new Date(event.endTime);
    } else if (event.end_time) {
      endDate = new Date(event.end_time);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getEventTime();

  const handleDelete = async () => {
    if (!grantId || event.readOnly) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/nylas-v3/calendars/events/${event.id}?accountId=${grantId}&calendarId=${event.calendarId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete event');
      }

      // Refresh events and close modal
      await refreshEvents();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      alert(err.message || 'Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get color class
  const getColorClass = () => {
    const color = event.color || 'blue';
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-950 border-blue-300 dark:border-blue-700',
      green: 'bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-700',
      red: 'bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-700',
      purple: 'bg-purple-100 dark:bg-purple-950 border-purple-300 dark:border-purple-700',
      orange: 'bg-orange-100 dark:bg-orange-950 border-orange-300 dark:border-orange-700',
      pink: 'bg-pink-100 dark:bg-pink-950 border-pink-300 dark:border-pink-700',
      yellow: 'bg-yellow-100 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700',
      gray: 'bg-gray-100 dark:bg-gray-950 border-gray-300 dark:border-gray-700',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <span className="flex-1">{event.title}</span>
            <div className={cn('w-3 h-3 rounded-full flex-shrink-0 mt-1', getColorClass())} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time */}
          {startDate && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(startDate, 'h:mm a')}
                  {endDate && ` - ${format(endDate, 'h:mm a')}`}
                </div>
              </div>
            </div>
          )}

          {/* Calendar */}
          {event.calendarName && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm">{event.calendarName}</div>
              </div>
            </div>
          )}

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm">{event.location}</div>
              </div>
            </div>
          )}

          {/* Participants */}
          {event.participants && event.participants.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-2">
                  {event.participants.length} attendee{event.participants.length !== 1 ? 's' : ''}
                </div>
                <div className="space-y-1">
                  {event.participants.map((participant, i) => (
                    <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span>{participant.name || participant.email}</span>
                      {participant.status && (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full',
                            participant.status === 'yes' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
                            participant.status === 'no' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
                            participant.status === 'maybe' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                          )}
                        >
                          {participant.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conference link */}
          {event.conferencing && (
            <div className="flex items-start gap-3">
              <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <a
                  href={event.conferencing.details?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Join video call
                </a>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-4 border-t border-border">
              <div className="text-sm whitespace-pre-wrap">{event.description}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || event.readOnly}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {!event.readOnly && (
                <Button size="sm" disabled>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
