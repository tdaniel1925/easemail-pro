/**
 * Event Modal Component
 * Create and edit calendar events
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Bell, Repeat, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import EmailAutocomplete from '@/components/email/EmailAutocomplete';
import InvitationReviewModal from './InvitationReviewModal';
import { useAccount } from '@/contexts/AccountContext';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any; // Existing event for editing
  onSuccess?: () => void;
  defaultDate?: Date; // Pre-fill date when creating
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'UTC', label: 'UTC' },
];

export default function EventModal({ isOpen, onClose, event, onSuccess, defaultDate }: EventModalProps) {
  const { selectedAccount } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizerInfo, setOrganizerInfo] = useState<{ name: string; email: string } | null>(null);

  // Calendar and account state
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'will-sync' | 'local-only' | 'no-account'>('will-sync');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [timezone, setTimezone] = useState<string>(() => {
    // Auto-detect user's timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  });
  const [busy, setBusy] = useState(true);
  const [reminder, setReminder] = useState<number>(15); // minutes before
  const [attendees, setAttendees] = useState<Array<{email: string, name?: string}>>([]);
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEnd, setRecurrenceEnd] = useState<'never' | 'count' | 'until'>('never');
  const [recurrenceCount, setRecurrenceCount] = useState(10);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<any>(null);

  // Fetch available calendars and organizer info
  useEffect(() => {
    if (isOpen && !organizerInfo) {
      setLoadingCalendars(true);

      // Get user info and calendars from Supabase
      import('@/lib/supabase/client').then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data: { user } }) => {
          if (user) {
            // Try to get full user info from API
            try {
              const response = await fetch(`/api/user/${user.id}`);
              if (response.ok) {
                const userData = await response.json();
                setOrganizerInfo({
                  name: userData.fullName || user.email || 'Event Organizer',
                  email: user.email || '',
                });
              } else {
                throw new Error('Failed to fetch user');
              }
            } catch {
              // Fallback to just email
              setOrganizerInfo({
                name: user.email || 'Event Organizer',
                email: user.email || '',
              });
            }

            // Fetch calendars from the selected account (from AccountContext)
            if (selectedAccount?.nylasGrantId) {
              try {
                setSelectedAccountId((selectedAccount as any).id);

                // Fetch calendars for the selected account
                const calendarsResponse = await fetch(`/api/nylas-v3/calendars?accountId=${(selectedAccount as any).nylasGrantId}`);
                if (calendarsResponse.ok) {
                  const calendarsData = await calendarsResponse.json();
                  if (calendarsData.success && calendarsData.calendars) {
                    console.log('[EventModal] Fetched calendars:', calendarsData.calendars.length);

                    // Filter out system calendars (holidays, birthdays, etc.)
                    const userCalendars = calendarsData.calendars.filter((cal: any) => {
                      const lowerName = (cal.name || '').toLowerCase();
                      const excludePatterns = ['holiday', 'birthday', 'en.usa', 'contacts', 'week numbers'];
                      return !excludePatterns.some(pattern => lowerName.includes(pattern));
                    });

                    setAvailableCalendars(userCalendars);

                    // Auto-select primary calendar first (it's always writable for the account owner)
                    // Then try first non-readOnly, then fall back to first available
                    const primaryCal = userCalendars.find((cal: any) => cal.isPrimary);
                    const firstWritable = userCalendars.find((cal: any) => !cal.readOnly);
                    const defaultCal = primaryCal || firstWritable || userCalendars[0];

                    console.log('[EventModal] Selected calendar:', defaultCal?.name, 'isPrimary:', defaultCal?.isPrimary, 'readOnly:', defaultCal?.readOnly);

                    if (defaultCal) {
                      setSelectedCalendarId(defaultCal.id);
                    }
                    setSyncStatus('will-sync');
                  }
                } else {
                  setSyncStatus('local-only');
                }
              } catch (err) {
                console.error('Failed to fetch calendars:', err);
                setSyncStatus('local-only');
              }
            } else {
              setSyncStatus('no-account');
              setError('No calendar account connected. Event will be created locally only. Connect a calendar account in Settings to sync events.');
            }
          } else {
            setOrganizerInfo({
              name: 'Event Organizer',
              email: '',
            });
            setSyncStatus('no-account');
          }
          setLoadingCalendars(false);
        }).catch(() => {
          setOrganizerInfo({
            name: 'Event Organizer',
            email: '',
          });
          setLoadingCalendars(false);
          setSyncStatus('no-account');
        });
      });
    }
  }, [isOpen, organizerInfo]);

  // Helper function to strip HTML tags from text
  const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, '');
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Initialize form with event data or defaults
  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      // Strip HTML tags from description (Nylas events often include HTML)
      setDescription(stripHtmlTags(event.description || ''));
      setLocation(event.location || '');
      
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      
      setStartDate(format(start, 'yyyy-MM-dd'));
      setStartTime(format(start, 'HH:mm'));
      setEndDate(format(end, 'yyyy-MM-dd'));
      setEndTime(format(end, 'HH:mm'));
      setAllDay(event.allDay || false);

      if (event.reminders && event.reminders.length > 0) {
        setReminder(event.reminders[0].minutesBefore);
      }
      
      // Load existing attendees
      if (event.attendees && Array.isArray(event.attendees)) {
        setAttendees(event.attendees.map((a: any) => ({
          email: a.email,
          name: a.name || undefined,
        })));
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

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // Validate: Recurring weekly events must have at least one weekday selected
      if (isRecurring && recurrenceType === 'WEEKLY' && selectedWeekdays.length === 0) {
        setError('Please select at least one day of the week for weekly recurring events.');
        setLoading(false);
        return;
      }

      // Build datetime strings
      const startDateTime = allDay
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : new Date(`${startDate}T${startTime}`).toISOString();

      const endDateTime = allDay
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : new Date(`${endDate}T${endTime}`).toISOString();

      // Validate: Cannot create events in the past (with 1 minute grace period)
      const now = new Date();
      const graceNow = new Date(now.getTime() - 60000); // 1 minute grace
      const startDateObj = new Date(startDateTime);
      const endDateObj = new Date(endDateTime);

      if (!event && startDateObj < graceNow) {
        setError('Cannot create events in the past. Please select a future date and time.');
        setLoading(false);
        return;
      }

      // Validate: End time must be after start time (unless it's an all-day event on the same day)
      if (!allDay && endDateObj <= startDateObj) {
        setError('End date and time must be after start date and time.');
        setLoading(false);
        return;
      }

      // For all-day events, ensure end is at or after start date
      if (allDay && endDateObj < startDateObj) {
        setError('End date must be on or after start date.');
        setLoading(false);
        return;
      }

      // Warn about invalid attendee emails (don't block save)
      const invalidEmails = attendees.filter(a => !isValidEmail(a.email));
      if (invalidEmails.length > 0) {
        console.warn('Invalid email addresses:', invalidEmails.map(a => a.email).join(', '));
        // Show warning but allow save (Outlook behavior)
        setError(`⚠️ Warning: Some email addresses may be invalid: ${invalidEmails.map(a => a.email).join(', ')}. Event will be saved but invitations may fail.`);
        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
      }

      const eventData = {
        title,
        description: description || null,
        location: location || null,
        startTime: startDateTime,
        endTime: endDateTime,
        allDay,
        timezone,
        busy,
        calendarId: selectedCalendarId || null,
        accountId: selectedAccountId || null,
        reminders: reminder > 0 ? [{ type: 'popup', minutesBefore: reminder }] : [],
        isRecurring,
        recurrenceRule: isRecurring ? buildRecurrenceRule() : null,
        recurrenceEndDate: isRecurring && recurrenceEnd === 'until' && recurrenceUntil
          ? new Date(recurrenceUntil).toISOString()
          : null,
        attendees: attendees.map(a => ({
          email: a.email,
          name: a.name || undefined,
          status: 'pending' as const,
        })),
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

      // If event has attendees and this is a new event, show review modal
      if (!event && attendees.length > 0 && data.event) {
        setCreatedEvent(data.event);
        setShowReviewModal(true);
        // Don't close modal yet - wait for review
      } else {
        onSuccess?.();
        onClose();
        resetForm();
      }

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
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
    setBusy(true);
    setReminder(15);
    setIsRecurring(false);
    setRecurrenceType('WEEKLY');
    setRecurrenceInterval(1);
    setRecurrenceEnd('never');
    setRecurrenceCount(10);
    setRecurrenceUntil('');
    setSelectedWeekdays([]);
    setAttendees([]);
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 px-1 py-2">
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

          {/* Calendar Selector */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Calendar *</label>
            </div>
            <select
              value={selectedCalendarId}
              onChange={(e) => setSelectedCalendarId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
              required
              disabled={loadingCalendars || availableCalendars.length === 0}
            >
              {loadingCalendars ? (
                <option>Loading calendars...</option>
              ) : availableCalendars.length === 0 ? (
                <option value="">No calendars available - Connect a calendar account in Settings</option>
              ) : (
                availableCalendars
                  .filter(cal => !cal.readOnly)
                  .map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}{cal.isPrimary ? ' (Primary)' : ''}
                    </option>
                  ))
              )}
            </select>
            {/* Sync Status Indicator */}
            <div className="mt-2 text-xs flex items-center gap-1.5">
              {syncStatus === 'will-sync' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-muted-foreground">
                    Will sync to {availableCalendars.find(c => c.id === selectedCalendarId)?.name}
                  </span>
                </>
              )}
              {syncStatus === 'local-only' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                  <span className="text-muted-foreground">
                    Will be created locally (sync may happen later)
                  </span>
                </>
              )}
              {syncStatus === 'no-account' && (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-muted-foreground">
                    No calendar account connected - event will be local only
                  </span>
                </>
              )}
            </div>
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
                  min={new Date().toISOString().split('T')[0]}
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
                  min={startDate || new Date().toISOString().split('T')[0]}
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

            {/* Timezone Selector */}
            {!allDay && (
              <div>
                <label className="block text-xs font-medium mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
                {/* Timezone Warning */}
                {timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
                  <div className="mt-2 flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      This event is in <span className="font-medium">{timezone}</span>, which is different from your browser timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Busy/Free Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="busy"
                checked={busy}
                onChange={(e) => setBusy(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="busy" className="text-sm">Mark as busy (show as unavailable)</label>
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

          {/* Attendees */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <label className="text-sm font-medium">Attendees</label>
            </div>
            <EmailAutocomplete
              value={attendees}
              onChange={setAttendees}
              placeholder="Add attendees by name or email"
            />
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

        {/* Invitation Review Modal */}
        {showReviewModal && createdEvent && organizerInfo ? (
          <InvitationReviewModal
            isOpen={showReviewModal}
            onClose={() => {
              setShowReviewModal(false);
              onSuccess?.();
              onClose();
              resetForm();
            }}
            event={{
              id: createdEvent.id,
              title: createdEvent.title,
              description: createdEvent.description,
              location: createdEvent.location,
              startTime: new Date(createdEvent.startTime),
              endTime: new Date(createdEvent.endTime),
              allDay: createdEvent.allDay,
              timezone: createdEvent.timezone,
              organizerEmail: createdEvent.organizerEmail,
            }}
            attendees={attendees}
            organizer={organizerInfo}
            onSend={async (invitationData) => {
              const response = await fetch(`/api/calendar/events/${createdEvent.id}/send-invitations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invitationData),
              });

              const result = await response.json();
              if (!result.success) {
                throw new Error(result.error || 'Failed to send invitations');
              }
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

