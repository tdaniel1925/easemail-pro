/**
 * Event Dialog Component
 * Create and edit calendar events
 */

'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Users, Video, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirm } from '@/components/ui/confirm-dialog';
import EmailAutocomplete from '@/components/email/EmailAutocomplete';

interface EventDialogProps {
  accountId: string;
  calendarId: string;
  event?: any;
  initialDate?: Date;
  onClose: () => void;
  onSave?: () => void;
}

export function EventDialog({
  accountId,
  calendarId,
  event,
  initialDate,
  onClose,
  onSave,
}: EventDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [participants, setParticipants] = useState<Array<{ email: string; name?: string }>>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, Dialog } = useConfirm();

  useEffect(() => {
    if (event) {
      // Edit mode
      setTitle(event.title || '');
      setDescription(event.description || '');
      setLocation(event.location || '');

      if (event.when.start_time) {
        const startDateTime = new Date(event.when.start_time * 1000);
        setStartDate(startDateTime.toISOString().split('T')[0]);
        setStartTime(startDateTime.toTimeString().slice(0, 5));
      }

      if (event.when.end_time) {
        const endDateTime = new Date(event.when.end_time * 1000);
        setEndDate(endDateTime.toISOString().split('T')[0]);
        setEndTime(endDateTime.toTimeString().slice(0, 5));
      }

      if (event.when.date) {
        setStartDate(event.when.date);
        setAllDay(true);
      }

      setParticipants(event.participants || []);
      setBusy(event.busy ?? true);
    } else if (initialDate) {
      // Create mode with initial date
      setStartDate(initialDate.toISOString().split('T')[0]);
      setEndDate(initialDate.toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndTime('10:00');
    }
  }, [event, initialDate]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare event data
      const eventData: any = {
        accountId,
        calendarId,
        title,
        description: description || undefined,
        location: location || undefined,
        busy,
      };

      // Prepare when data
      if (allDay) {
        eventData.when = {
          date: startDate,
        };
      } else {
        const startDateTime = new Date(`${startDate}T${startTime}`);
        const endDateTime = new Date(`${endDate}T${endTime}`);

        eventData.when = {
          start_time: Math.floor(startDateTime.getTime() / 1000),
          end_time: Math.floor(endDateTime.getTime() / 1000),
        };
      }

      // Add participants if any
      if (participants.length > 0) {
        eventData.participants = participants;
      }

      // Create or update event
      if (event) {
        // Update existing event
        const response = await fetch(`/api/nylas-v3/calendars/events/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });

        if (!response.ok) {
          throw new Error('Failed to update event');
        }
      } else {
        // Create new event
        const response = await fetch('/api/nylas-v3/calendars/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData),
        });

        if (!response.ok) {
          throw new Error('Failed to create event');
        }
      }

      onSave?.();
      onClose();
    } catch (err) {
      console.error('Error saving event:', err);
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) {
      return;
    }

    const confirmed = await confirm({
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This action cannot be undone.',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(
        `/api/nylas-v3/calendars/events/${event.id}?accountId=${accountId}&calendarId=${calendarId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      onSave?.();
      onClose();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">
            {event ? 'Edit Event' : 'New Event'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="all-day"
                checked={allDay}
                onCheckedChange={(checked) => setAllDay(checked === true)}
              />
              <Label htmlFor="all-day" className="cursor-pointer">All day event</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              {!allDay && (
                <div>
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {!allDay && (
                <div>
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              rows={3}
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                className="pl-9"
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <Label>Participants</Label>
            <EmailAutocomplete
              value={participants}
              onChange={setParticipants}
              placeholder="Add participants..."
            />
          </div>

          {/* Busy/Free */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="busy"
              checked={busy}
              onCheckedChange={(checked) => setBusy(checked === true)}
            />
            <Label htmlFor="busy" className="cursor-pointer">
              Show as busy
            </Label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div>
            {event && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : event ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>

        {/* Confirm Dialog */}
        <Dialog />
      </div>
    </div>
  );
}
