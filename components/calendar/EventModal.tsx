/**
 * Event Modal Component
 * Create and edit calendar events
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Bell, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any; // Existing event for editing
  onSuccess?: () => void;
  defaultDate?: Date; // Pre-fill date when creating
}

const COLORS = [
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500' },
  { value: 'green', label: 'Green', bg: 'bg-green-500' },
  { value: 'red', label: 'Red', bg: 'bg-red-500' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-500' },
];

export default function EventModal({ isOpen, onClose, event, onSuccess, defaultDate }: EventModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('blue');
  const [reminder, setReminder] = useState<number>(15); // minutes before
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEnd, setRecurrenceEnd] = useState<'never' | 'count' | 'until'>('never');
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  // Initialize form with event data or defaults
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setLocation(event.location || '');
      
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      
      setStartDate(format(start, 'yyyy-MM-dd'));
      setStartTime(format(start, 'HH:mm'));
      setEndDate(format(end, 'yyyy-MM-dd'));
      setEndTime(format(end, 'HH:mm'));
      setAllDay(event.allDay || false);
      setColor(event.color || 'blue');
      
      if (event.reminders && event.reminders.length > 0) {
        setReminder(event.reminders[0].minutesBefore);
      }
    } else if (defaultDate) {
      const date = format(defaultDate, 'yyyy-MM-dd');
      setStartDate(date);
      setEndDate(date);
      setStartTime('09:00');
      setEndTime('10:00');
    }
  }, [event, defaultDate, isOpen]);

  const buildRecurrenceRule = () => {
    let rrule = `FREQ=${recurrenceType}`;
    
    if (recurrenceInterval > 1) {
      rrule += `;INTERVAL=${recurrenceInterval}`;
    }
    
    if (recurrenceType === 'WEEKLY' && selectedWeekdays.length > 0) {
      const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
      rrule += `;BYDAY=${selectedWeekdays.map(d => days[d]).join(',')}`;
    }
    
    if (recurrenceEnd === 'count') {
      rrule += `;COUNT=${recurrenceCount}`;
    } else if (recurrenceEnd === 'until' && recurrenceUntil) {
      rrule += `;UNTIL=${new Date(recurrenceUntil).toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    }
    
    return `RRULE:${rrule}`;
  };

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build datetime strings
      const startDateTime = allDay 
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString();
      
      const endDateTime = allDay
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : new Date(`${endDate}T${endTime}`).toISOString();

      const eventData = {
        title,
        description: description || null,
        location: location || null,
        startTime: startDateTime,
        endTime: endDateTime,
        allDay,
        color,
        reminders: reminder > 0 ? [{ type: 'popup', minutesBefore: reminder }] : [],
        isRecurring,
        recurrenceRule: isRecurring ? buildRecurrenceRule() : null,
        recurrenceEndDate: isRecurring && recurrenceEnd === 'until' && recurrenceUntil 
          ? new Date(recurrenceUntil).toISOString()
          : null,
      };

      const url = event 
        ? `/api/calendar/events/${event.id}`
        : '/api/calendar/events';
      
      const method = event ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to save event');
      }

      onSuccess?.();
      onClose();
      
      // Reset form
      resetForm();

    } catch (err: any) {
      console.error('Event save error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartDate('');
    setStartTime('');
    setEndDate('');
    setEndTime('');
    setAllDay(false);
    setColor('blue');
    setReminder(15);
    setIsRecurring(false);
    setRecurrenceType('WEEKLY');
    setRecurrenceInterval(1);
    setRecurrenceEnd('never');
    setRecurrenceCount(10);
    setRecurrenceUntil('');
    setSelectedWeekdays([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Edit Event' : 'New Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              className="w-full min-h-[100px] px-3 py-2 border border-border rounded-lg bg-background text-sm"
            />
          </div>

          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Date & Time</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="allDay" className="text-sm">All day</label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Start Date *</label>
                <Input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              {!allDay && (
                <div>
                  <label className="block text-xs font-medium mb-1">Start Time *</label>
                  <Input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">End Date *</label>
                <Input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              {!allDay && (
                <div>
                  <label className="block text-xs font-medium mb-1">End Time *</label>
                  <Input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Location</label>
            </div>
            <Input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add location"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full ${c.bg} ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Reminder</label>
            </div>
            <select
              value={reminder}
              onChange={(e) => setReminder(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value={0}>None</option>
              <option value={5}>5 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>

          {/* Recurrence */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Repeat</label>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isRecurring" className="text-sm">Repeat this event</label>
              </div>

              {isRecurring && (
                <div className="pl-6 space-y-3 border-l-2 border-border">
                  {/* Frequency & Interval */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Frequency</label>
                      <select
                        value={recurrenceType}
                        onChange={(e) => setRecurrenceType(e.target.value as any)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Every</label>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Weekly: Days of week */}
                  {recurrenceType === 'WEEKLY' && (
                    <div>
                      <label className="block text-xs font-medium mb-2">Repeat on</label>
                      <div className="flex gap-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleWeekday(idx)}
                            className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                              selectedWeekdays.includes(idx)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {day[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* End condition */}
                  <div>
                    <label className="block text-xs font-medium mb-2">Ends</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="never"
                          name="recurrenceEnd"
                          checked={recurrenceEnd === 'never'}
                          onChange={() => setRecurrenceEnd('never')}
                          className="rounded-full"
                        />
                        <label htmlFor="never" className="text-sm">Never</label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="count"
                          name="recurrenceEnd"
                          checked={recurrenceEnd === 'count'}
                          onChange={() => setRecurrenceEnd('count')}
                          className="rounded-full"
                        />
                        <label htmlFor="count" className="text-sm">After</label>
                        <Input
                          type="number"
                          min="1"
                          max="999"
                          value={recurrenceCount}
                          onChange={(e) => {
                            setRecurrenceCount(Number(e.target.value));
                            setRecurrenceEnd('count');
                          }}
                          disabled={recurrenceEnd !== 'count'}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">occurrences</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="until"
                          name="recurrenceEnd"
                          checked={recurrenceEnd === 'until'}
                          onChange={() => setRecurrenceEnd('until')}
                          className="rounded-full"
                        />
                        <label htmlFor="until" className="text-sm">On</label>
                        <Input
                          type="date"
                          value={recurrenceUntil}
                          onChange={(e) => {
                            setRecurrenceUntil(e.target.value);
                            setRecurrenceEnd('until');
                          }}
                          disabled={recurrenceEnd !== 'until'}
                          className="w-40"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

