/**
 * Quick Add V4 - Instant Event Creation
 *
 * No more conversational friction - just type and press Enter to create events instantly.
 * Uses OpenAI SDK with structured output for reliable parsing.
 *
 * Features:
 * - Single-line input with instant parsing
 * - Smart defaults for missing information
 * - Confidence indicator shows how well the AI understood
 * - Immediate event creation (no confirmation dialog)
 * - Shows created event confirmation
 */

'use client';

import { useState, useEffect } from 'react';
import { Send, Sparkles, Check, AlertCircle, Loader2, Calendar, Clock, ChevronDown, ChevronUp, MapPin, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import EmailAutocomplete from '@/components/email/EmailAutocomplete';

interface QuickAddV4Props {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

interface ParsedEvent {
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  description: string | null;
  attendees: string[];
  confidence: 'high' | 'medium' | 'low';
  explanation: string;
}

interface CalendarOption {
  id: string;
  name: string;
  accountId: string; // Database account ID
  nylasGrantId: string; // Nylas grant ID (required for API calls)
  accountEmail: string;
  hexColor?: string;
  isPrimary?: boolean;
  readOnly?: boolean;
}

export default function QuickAddV4({ isOpen, onClose, onEventCreated }: QuickAddV4Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatedEvent, setLastCreatedEvent] = useState<ParsedEvent | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [calendars, setCalendars] = useState<CalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [customDuration, setCustomDuration] = useState<number>(60); // Default 60 minutes

  // More Options state
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [additionalAttendees, setAdditionalAttendees] = useState<Array<{ email: string; name?: string }>>([]);
  const [additionalLocation, setAdditionalLocation] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Fetch writable calendars when dialog opens
  useEffect(() => {
    if (isOpen) {
      setInput('');
      setError(null);
      setShowSuccess(false);
      setLastCreatedEvent(null);
      setCustomDuration(60); // Reset to default 1 hour
      setShowMoreOptions(false);
      setAdditionalAttendees([]);
      setAdditionalLocation('');
      setAdditionalNotes('');
      fetchWritableCalendars();
    }
  }, [isOpen]);

  const fetchWritableCalendars = async () => {
    setLoadingCalendars(true);
    try {
      // Fetch all accounts
      const accountsResponse = await fetch('/api/nylas/accounts');
      const accountsData = await accountsResponse.json();

      if (!accountsData.success || !accountsData.accounts) {
        throw new Error('Failed to fetch accounts');
      }

      const activeAccounts = accountsData.accounts.filter(
        (acc: any) => acc.isActive && acc.nylasGrantId
      );

      const allCalendars: CalendarOption[] = [];

      // Fetch calendars for each account
      for (const account of activeAccounts) {
        try {
          const response = await fetch(`/api/nylas-v3/calendars?accountId=${account.nylasGrantId}`);
          const data = await response.json();

          if (data.success && data.calendars) {
            // Only include writable calendars (exclude read-only, holidays, birthdays, and shared calendars)
            const writableCalendars = data.calendars
              .filter((cal: any) => {
                // Exclude read-only calendars
                if (cal.readOnly) return false;

                // Exclude holiday and birthday calendars by name pattern
                const lowerName = cal.name.toLowerCase();
                const excludePatterns = ['holiday', 'birthday', 'en.usa', 'contacts', 'week numbers'];
                if (excludePatterns.some(pattern => lowerName.includes(pattern))) return false;

                // Exclude calendars that don't support event creation by ID pattern
                if (cal.id && (cal.id.startsWith('en.') || cal.id.includes('#holiday') || cal.id.includes('#contacts'))) return false;

                return true;
              })
              .map((cal: any) => ({
                id: cal.id,
                name: cal.name,
                accountId: account.id, // Store database account ID for API calls
                nylasGrantId: account.nylasGrantId, // Store Nylas grant ID for event creation
                accountEmail: account.emailAddress,
                hexColor: cal.hexColor,
                isPrimary: cal.isPrimary,
                readOnly: cal.readOnly,
              }));

            allCalendars.push(...writableCalendars);
          }
        } catch (err) {
          console.error(`Failed to fetch calendars for ${account.emailAddress}:`, err);
        }
      }

      setCalendars(allCalendars);

      // Auto-select primary calendar if available
      const primaryCalendar = allCalendars.find(cal => cal.isPrimary);
      if (primaryCalendar) {
        setSelectedCalendarId(primaryCalendar.id);
      } else if (allCalendars.length > 0) {
        setSelectedCalendarId(allCalendars[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
      setError('Failed to load calendars. Please try again.');
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Validate calendar selection
    if (!selectedCalendarId) {
      setError('Please select a calendar');
      return;
    }

    const userInput = input.trim();
    setInput(''); // Clear immediately for better UX
    setLoading(true);
    setError(null);
    setShowSuccess(false);

    try {
      // Get the selected calendar's account ID
      const selectedCalendar = calendars.find(cal => cal.id === selectedCalendarId);
      if (!selectedCalendar) {
        throw new Error('Selected calendar not found');
      }

      // Step 1: Parse the natural language input
      const parseResponse = await fetch('/api/calendar/parse-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userInput,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json();
        throw new Error(errorData.error || 'Failed to parse event');
      }

      const { event } = await parseResponse.json();

      // Override endTime with custom duration (in minutes)
      const startTime = new Date(event.startTime);
      const endTime = new Date(startTime.getTime() + customDuration * 60 * 1000);

      // Combine AI-parsed attendees with additional attendees from More Options
      const additionalEmails = additionalAttendees.map(a => a.email);
      const allAttendees = [
        ...event.attendees,
        ...additionalEmails
      ].filter((email, index, self) => self.indexOf(email) === index); // Remove duplicates

      // Use additional location/notes if provided, otherwise use AI-parsed values
      const finalLocation = additionalLocation.trim() || event.location;
      const finalDescription = additionalNotes.trim() || event.description;

      // Step 2: Create the event immediately (no confirmation) with selected calendar AND account
      const eventPayload = {
        title: event.title,
        startTime: event.startTime,
        endTime: endTime.toISOString(), // Use custom duration
        location: finalLocation,
        description: finalDescription,
        calendarId: selectedCalendarId, // ✅ Nylas calendar ID for sync
        accountId: selectedCalendar.accountId, // ✅ Database account ID for proper account resolution
        nylasGrantId: selectedCalendar.nylasGrantId, // ✅ Nylas grant ID to ensure correct account is used
        attendees: allAttendees.map((email: string) => ({
          email,
          status: 'pending',
        })),
      };

      console.log('📤 [QuickAdd V4] Creating event with payload:', {
        calendarId: selectedCalendarId,
        calendarName: selectedCalendar.name,
        accountId: selectedCalendar.accountId,
        nylasGrantId: selectedCalendar.nylasGrantId,
        accountEmail: selectedCalendar.accountEmail,
        title: event.title,
      });

      const createResponse = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const { event: createdEvent } = await createResponse.json();

      // Show success
      setLastCreatedEvent(event);
      setShowSuccess(true);

      // Call the callback to trigger calendar refresh
      onEventCreated();

      // Close dialog with smooth animation after showing success message
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('[QuickAdd V4] Error:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-accent text-accent-foreground',
      medium: 'bg-secondary text-secondary-foreground',
      low: 'bg-muted text-muted-foreground',
    };

    return (
      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', styles[confidence])}>
        {confidence} confidence
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold">Quick Add V4</div>
              <div className="text-xs text-muted-foreground font-normal">Instant event creation with AI</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Calendar Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Select Calendar
          </label>
          <Select
            value={selectedCalendarId}
            onValueChange={setSelectedCalendarId}
            disabled={loadingCalendars || calendars.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingCalendars ? "Loading calendars..." : "Choose a calendar"} />
            </SelectTrigger>
            <SelectContent>
              {calendars.map((calendar) => (
                <SelectItem key={calendar.id} value={calendar.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: calendar.hexColor || '#3b82f6' }}
                    />
                    <span className="truncate">
                      {calendar.name}
                      {calendar.isPrimary && ' (Primary)'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {calendar.accountEmail}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {calendars.length === 0 && !loadingCalendars && (
            <p className="text-xs text-red-600">No writable calendars found. Please connect an account.</p>
          )}
          {selectedCalendarId && calendars.length > 0 && (
            <div className="flex items-start gap-2 p-2 bg-accent/50 border border-border rounded-md">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: calendars.find(c => c.id === selectedCalendarId)?.hexColor || '#3b82f6' }}
                />
                <span className="font-medium">Event will be added to:</span>
                <span className="text-foreground font-semibold">
                  {calendars.find(c => c.id === selectedCalendarId)?.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Duration Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Event Duration
          </label>
          <Select
            value={customDuration.toString()}
            onValueChange={(value) => setCustomDuration(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
              <SelectItem value="180">3 hours</SelectItem>
              <SelectItem value="240">4 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Event Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="lunch tomorrow at noon, team meeting Friday 3pm..."
            disabled={loading || !selectedCalendarId}
            className="flex-1"
            autoFocus
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim() || !selectedCalendarId}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* More Options Toggle */}
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="w-full justify-between text-muted-foreground hover:text-foreground"
          >
            <span className="text-xs font-medium">More Options (attendees, notes, location)</span>
            {showMoreOptions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {/* Expandable More Options Section */}
          {showMoreOptions && (
            <div className="space-y-3 mt-3 pt-3 border-t border-border">
              {/* Attendees */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Add Attendees
                </label>
                <EmailAutocomplete
                  value={additionalAttendees}
                  onChange={setAdditionalAttendees}
                  placeholder="Add attendees (comma separated or select from contacts)"
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <Input
                  value={additionalLocation}
                  onChange={(e) => setAdditionalLocation(e.target.value)}
                  placeholder="Add location or meeting link"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </label>
                <Textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Add notes or agenda"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Press Enter to create instantly • Adjust duration above if needed • Uses smart defaults for missing details
        </p>
      </form>

      {/* Success Message */}
      {showSuccess && lastCreatedEvent && (
        <Alert className="border-border bg-accent">
          <Check className="h-4 w-4 text-accent-foreground" />
          <AlertDescription className="text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {lastCreatedEvent.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTime(lastCreatedEvent.startTime)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {lastCreatedEvent.explanation}
                </p>
              </div>
              {getConfidenceBadge(lastCreatedEvent.confidence)}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Tips */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p className="font-medium">Examples:</p>
        <ul className="space-y-0.5 ml-3">
          <li>• "lunch tomorrow" → Creates lunch at noon for 1 hour</li>
          <li>• "team meeting Friday 3pm for 90 min" → Specific time & duration</li>
          <li>• "call" → Next available hour, 30 min duration</li>
          <li>• "dentist appointment Tuesday 2pm" → Creates as specified</li>
        </ul>
      </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
