/**
 * Quick Add Component
 * Natural language event creation (e.g., "Meeting tomorrow at 3pm")
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Calendar, Clock, MapPin, Mic, MicOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as chrono from 'chrono-node';
import * as Sentry from '@sentry/nextjs';

interface QuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

export default function QuickAdd({ isOpen, onClose, onEventCreated }: QuickAddProps) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [browserSupportsVoice, setBrowserSupportsVoice] = useState(false);
  const [autoCreateAfterVoice, setAutoCreateAfterVoice] = useState(false);

  // Calendar selection
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Fetch available calendars
  useEffect(() => {
    if (isOpen && availableCalendars.length === 0) {
      setLoadingCalendars(true);

      import('@/lib/supabase/client').then(({ createClient }) => {
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data: { user } }) => {
          if (user) {
            try {
              const accountsResponse = await fetch('/api/accounts');
              if (accountsResponse.ok) {
                const accountsData = await accountsResponse.json();
                const calendarAccounts = accountsData.accounts?.filter((acc: any) =>
                  acc.nylasGrantId &&
                  (acc.provider === 'google' || acc.provider === 'microsoft') &&
                  acc.nylasScopes?.some((s: string) => s.toLowerCase().includes('calendar'))
                ) || [];

                if (calendarAccounts.length > 0) {
                  const primaryAccount = calendarAccounts.find((acc: any) => acc.isPrimary) || calendarAccounts[0];

                  const calendarsResponse = await fetch(`/api/nylas-v3/calendars?accountId=${primaryAccount.nylasGrantId}`);
                  if (calendarsResponse.ok) {
                    const calendarsData = await calendarsResponse.json();
                    if (calendarsData.success && calendarsData.calendars) {
                      setAvailableCalendars(calendarsData.calendars);
                      const primaryCal = calendarsData.calendars.find((cal: any) => cal.isPrimary && !cal.readOnly);
                      const firstWritable = calendarsData.calendars.find((cal: any) => !cal.readOnly);
                      const defaultCal = primaryCal || firstWritable || calendarsData.calendars[0];
                      if (defaultCal) {
                        setSelectedCalendarId(defaultCal.id);
                      }
                    }
                  }
                }
              }
            } catch (err) {
              console.error('Failed to fetch calendars:', err);
            }
          }
          setLoadingCalendars(false);
        });
      });
    }
  }, [isOpen, availableCalendars.length]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');

          console.log('[QuickAdd] Voice transcript:', transcript);
          
          // Track voice input usage
          Sentry.startSpan(
            {
              op: 'voice.recognition',
              name: 'Quick Add Voice Input',
            },
            (span) => {
              span.setAttribute('transcript', transcript);
              span.setAttribute('isFinal', event.results[0].isFinal);
              
              setInput(transcript);
              parseInput(transcript);
              
              // Mark that we should auto-create after voice ends
              if (event.results[0].isFinal) {
                setAutoCreateAfterVoice(true);
              }
            }
          );
        };

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError('Microphone access denied. Please allow microphone access in your browser settings.');
          } else if (event.error === 'no-speech') {
            setError('No speech detected. Please try again.');
          }
        };

        recognitionInstance.onend = () => {
          console.log('[QuickAdd] Voice recognition ended');
          setIsListening(false);
          
          // Auto-create event after voice input completes (with a small delay to ensure preview is set)
          if (autoCreateAfterVoice) {
            console.log('[QuickAdd] Auto-creating event from voice input');
            setTimeout(() => {
              handleCreate();
            }, 500);
            setAutoCreateAfterVoice(false);
          }
        };

        setRecognition(recognitionInstance);
        setBrowserSupportsVoice(true);
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognition) {
      setError('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setError(null);
      recognition.start();
      setIsListening(true);
    }
  };

  // Preprocess text to fix common typos and variations
  const preprocessText = (text: string): string => {
    let cleaned = text.trim();
    
    // FIRST: Remove common filler phrases
    // Handle "for me for" first (most specific)
    cleaned = cleaned.replace(/^(set|make|create|add|schedule)\s+(an?\s+)?(appointment|event|meeting)\s+for\s+me\s+for\s+/gi, '');
    // Then "for me" without second "for"
    cleaned = cleaned.replace(/^(set|make|create|add|schedule)\s+(an?\s+)?(appointment|event|meeting)\s+for\s+me\s+/gi, '');
    // Then just "for"
    cleaned = cleaned.replace(/^(set|make|create|add|schedule)\s+(an?\s+)?(appointment|event|meeting)\s+for\s+/gi, '');
    // Finally, just the action word + type
    cleaned = cleaned.replace(/^(set|make|create|add|schedule)\s+(an?\s+)?(appointment|event|meeting)\s+/gi, '');
    
    // THEN: Fix common time typos: "9ma" → "9am", "3mp" → "3pm"  
    // Use function form to avoid issues with $1 in some contexts
    cleaned = cleaned.replace(/(\d+)\s*ma\b/gi, (match, p1) => p1 + 'am');
    cleaned = cleaned.replace(/(\d+)\s*mp\b/gi, (match, p1) => p1 + 'pm');
    
    // Fix common day typos
    cleaned = cleaned.replace(/\btomorow\b/gi, 'tomorrow');
    
    // Fix common word typos
    cleaned = cleaned.replace(/\bappointmen\b/gi, 'appointment');
    cleaned = cleaned.replace(/\bcalndae\b/gi, 'calendar');
    
    // Normalize spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  };

  // Enhanced parsing with attendees, location, and description extraction
  const parseInput = (text: string) => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }

    try {
      // Preprocess text to fix typos
      const processedText = preprocessText(text);
      console.log('[QuickAdd] Original text:', text);
      console.log('[QuickAdd] Processed text:', processedText);

      // Parse the natural language input
      const results = chrono.parse(processedText, new Date(), { forwardDate: true });

      if (results.length === 0) {
        // Default to 5 minutes from now to prevent past event errors
        const minStartTime = new Date(Date.now() + 5 * 60 * 1000);
        setPreview({
          title: text,
          startTime: minStartTime,
          endTime: new Date(minStartTime.getTime() + 60 * 60 * 1000), // 1 hour later
          hasDate: false,
          fullTranscript: text,
        });
        return;
      }

      const result = results[0];
      const startTime = result.start.date();

      // Try to get end time if specified
      let endTime;
      if (result.end) {
        endTime = result.end.date();
      } else {
        // Default to 1 hour duration
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      }

      // ENHANCED PARSING: Extract all details from the original text
      const fullText = text; // Keep full transcription

      // Extract title (text before the date/time)
      let title = processedText.substring(0, result.index).trim();

      // If no title before date, use text after date
      if (!title) {
        title = processedText.substring(result.index + result.text.length).trim();
      }

      // If still no title, extract from original text (before preprocessing removed action words)
      if (!title) {
        // Try to find a meaningful title from the original text
        const originalTitle = text.replace(/\b(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at|on)\b.*/gi, '').trim();
        title = originalTitle || 'Meeting';
      }

      // Extract location (text after "at", "in", "on")
      let location = null;
      const locationPatterns = [
        /\b(?:at|in|on)\s+([^,]+?)\s*(?:with|about|regarding|to discuss|$)/i,
        /\b(?:at|in|on)\s+([^,]+?)$/i
      ];

      for (const pattern of locationPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          const potentialLocation = match[1].trim();
          // Filter out time references and attendee names
          if (!potentialLocation.match(/\d+\s*(?:am|pm|a\.m\.|p\.m\.)/i) &&
              !potentialLocation.match(/^(?:with|about|regarding)/i)) {
            location = potentialLocation;
            break;
          }
        }
      }

      // Extract attendees (text after "with")
      let attendees: string[] = [];
      const withMatch = fullText.match(/\bwith\s+([^,]+?)(?:\s+at|\s+in|\s+on|\s+about|\s+to discuss|$)/i);
      if (withMatch) {
        const attendeeText = withMatch[1].trim();
        // Split by "and" or commas
        attendees = attendeeText
          .split(/\s+and\s+|,\s*/)
          .map(name => name.trim())
          .filter(name => name && !name.match(/\d+\s*(?:am|pm)/i));
      }

      // Extract description/notes (text after "about", "regarding", "to discuss")
      let description = null;
      const descPatterns = [
        /\b(?:about|regarding|to discuss)\s+(.+?)$/i,
        /\b(?:about|regarding|to discuss)\s+([^,]+)/i
      ];

      for (const pattern of descPatterns) {
        const match = fullText.match(pattern);
        if (match) {
          description = match[1].trim();
          break;
        }
      }

      // Clean up title - remove location, attendees, description fragments
      title = title.replace(/\b(?:at|in|on)\s+.*/i, '').trim();
      title = title.replace(/\bwith\s+.*/i, '').trim();
      title = title.replace(/\b(?:about|regarding|to discuss)\s+.*/i, '').trim();
      title = title.replace(/^(meeting|call|event)\s*/i, '').trim();

      // If title is still empty or too generic, try to extract from description or use a better default
      if (!title || title.length < 2) {
        if (description && description.length > 0) {
          // Use first few words of description as title
          const words = description.split(/\s+/).slice(0, 3).join(' ');
          title = words.charAt(0).toUpperCase() + words.slice(1);
        } else if (attendees.length > 0) {
          title = `Meeting with ${attendees[0]}`;
        } else if (location) {
          title = `Event at ${location}`;
        } else {
          title = 'Meeting';
        }
      }

      // Capitalize first letter of title
      title = title.charAt(0).toUpperCase() + title.slice(1);

      setPreview({
        title,
        startTime,
        endTime,
        location,
        attendees,
        description,
        fullTranscript: fullText, // Keep full voice/text input
        hasDate: true,
      });

    } catch (err) {
      console.error('Parse error:', err);
      // Default to 5 minutes from now on parse error
      const minStartTime = new Date(Date.now() + 5 * 60 * 1000);
      setPreview({
        title: text,
        startTime: minStartTime,
        endTime: new Date(minStartTime.getTime() + 60 * 60 * 1000),
        hasDate: false,
        fullTranscript: text,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    parseInput(value);
  };

  const handleCreate = async () => {
    if (!preview) return;

    // Prevent double submission
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log('[QuickAdd] Creating event:', {
        title: preview.title,
        startTime: preview.startTime,
        endTime: preview.endTime,
        location: preview.location
      });
      
      await Sentry.startSpan(
        {
          op: 'calendar.event.create',
          name: 'Quick Add Event Creation',
        },
        async (span) => {
          span.setAttribute('title', preview.title);
          span.setAttribute('hasDate', preview.hasDate);
          span.setAttribute('hasLocation', !!preview.location);
          
          const response = await fetch('/api/calendar/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: preview.title,
              description: preview.description || null,
              startTime: preview.startTime.toISOString(),
              endTime: preview.endTime.toISOString(),
              location: preview.location || null,
              allDay: false,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              busy: true,
              color: 'blue',
              calendarId: selectedCalendarId || null,
              reminders: [{ type: 'popup', minutesBefore: 15 }],
            }),
          });

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Failed to create event');
          }

          console.log('[QuickAdd] Event created successfully:', data.event);
          span.setAttribute('eventId', data.event?.id);
          
          onEventCreated();
          handleClose();
        }
      );

    } catch (err: any) {
      console.error('[QuickAdd] Create error:', err);
      Sentry.captureException(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Stop voice recognition if active
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
    setInput('');
    setPreview(null);
    setError(null);
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Add Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input with Voice */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Describe your event
            </label>
            <div className="relative">
              <Input
                value={input}
                onChange={handleInputChange}
                placeholder='e.g., "Team meeting tomorrow at 2pm" or "Lunch with Sarah Friday noon"'
                className="text-base pr-12"
                autoFocus
              />
              {browserSupportsVoice && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoiceInput}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 ${
                    isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title={isListening ? 'Stop recording' : 'Voice input'}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isListening ? (
                <span className="text-red-500 font-medium">🎤 Listening... Speak your event (will auto-create)</span>
              ) : loading ? (
                <span className="text-blue-500 font-medium">⏳ Creating your event...</span>
              ) : (
                <>Try: "tomorrow at 3pm", "next Friday 10am", "Monday 9:30am-11am"</>
              )}
            </p>
          </div>

          {/* Calendar Selector */}
          {availableCalendars.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Calendar
              </label>
              <select
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                disabled={loadingCalendars}
              >
                {loadingCalendars ? (
                  <option>Loading calendars...</option>
                ) : (
                  availableCalendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}{cal.isPrimary ? ' (Primary)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="p-4 bg-accent rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Event Preview</span>
              </div>

              <div className="space-y-3">
                {/* Full Transcript */}
                {preview.fullTranscript && (
                  <div className="pb-2 border-b border-border/50">
                    <div className="text-xs text-muted-foreground mb-1">You said:</div>
                    <div className="text-sm italic text-muted-foreground">"{preview.fullTranscript}"</div>
                  </div>
                )}

                {/* Title */}
                <div>
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="font-medium">{preview.title}</div>
                </div>

                {/* Time */}
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Time
                  </div>
                  <div className="text-sm">
                    {formatDate(preview.startTime)} → {formatDate(preview.endTime)}
                  </div>
                  {!preview.hasDate && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      ⚠️ No date/time detected, using current time
                    </div>
                  )}
                </div>

                {/* Location */}
                {preview.location && (
                  <div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Location
                    </div>
                    <div className="text-sm">{preview.location}</div>
                  </div>
                )}

                {/* Attendees */}
                {preview.attendees && preview.attendees.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      With
                    </div>
                    <div className="text-sm">
                      {preview.attendees.join(', ')}
                    </div>
                  </div>
                )}

                {/* Description */}
                {preview.description && (
                  <div>
                    <div className="text-sm text-muted-foreground">About</div>
                    <div className="text-sm">{preview.description}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !preview}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

