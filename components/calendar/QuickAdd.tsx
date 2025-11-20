/**
 * Quick Add Component - GPT-4o Powered
 * Natural language event creation with AI parsing
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Calendar, Clock, MapPin, Mic, MicOff, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState<string | null>(null);
  const [originalRequest, setOriginalRequest] = useState<string>(''); // Track original request
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [browserSupportsVoice, setBrowserSupportsVoice] = useState(false);

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

          Sentry.startSpan(
            {
              op: 'voice.recognition',
              name: 'Quick Add Voice Input',
            },
            (span) => {
              span.setAttribute('transcript', transcript);
              span.setAttribute('isFinal', event.results[0].isFinal);

              setInput(transcript);

              // Only parse on final result
              if (event.results[0].isFinal) {
                parseInputWithAI(transcript);
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
      setClarificationQuestion(null);
      recognition.start();
      setIsListening(true);
    }
  };

  // Parse input using GPT-4o API
  const parseInputWithAI = async (text: string) => {
    if (!text.trim()) {
      setPreview(null);
      setClarificationQuestion(null);
      return;
    }

    setParsing(true);
    setError(null);
    setClarificationQuestion(null);

    try {
      console.log('[QuickAdd] Parsing with GPT-4o:', text);

      const response = await fetch('/api/calendar/parse-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse event');
      }

      console.log('[QuickAdd] Parse result:', data);

      if (data.needsClarification) {
        // AI needs more information
        setClarificationQuestion(data.question);
        setPreview(data.partialEvent || null);

        // Store original request if this is the first clarification
        if (conversationHistory.length === 0) {
          setOriginalRequest(text);
        }

        // Add to conversation history
        setConversationHistory([
          ...conversationHistory,
          { role: 'user', content: text },
          { role: 'assistant', content: data.question },
        ]);

        // Clear input so user can type their answer
        setInput('');
      } else {
        // AI successfully parsed the event
        setClarificationQuestion(null);
        setPreview({
          title: data.event.title,
          startTime: new Date(data.event.startTime),
          endTime: new Date(data.event.endTime),
          location: data.event.location || null,
          description: data.event.description || null,
          attendees: data.event.attendees || [],
          confidence: data.confidence,
          explanation: data.explanation,
        });

        // Reset conversation history
        setConversationHistory([]);
      }

    } catch (err: any) {
      console.error('[QuickAdd] Parse error:', err);
      Sentry.captureException(err);
      setError(err.message || 'Failed to parse event');
    } finally {
      setParsing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && !parsing) {
      parseInputWithAI(input);
    }
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
          span.setAttribute('hasLocation', !!preview.location);
          span.setAttribute('confidence', preview.confidence || 'unknown');

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
    setClarificationQuestion(null);
    setOriginalRequest('');
    setConversationHistory([]);
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
                onKeyPress={handleKeyPress}
                placeholder='e.g., "Team meeting tomorrow at 2pm for 1 hour"'
                className="text-base pr-12 py-5 px-3"
                autoFocus
                disabled={parsing || loading}
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
                  disabled={parsing || loading}
                >
                  {isListening ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">
                {isListening ? (
                  <span className="text-red-500 font-medium">🎤 Listening...</span>
                ) : parsing ? (
                  <span className="text-blue-500 font-medium">🤔 Understanding your event...</span>
                ) : loading ? (
                  <span className="text-blue-500 font-medium">⏳ Creating event...</span>
                ) : (
                  <>Type or speak naturally, then press Enter or click Parse</>
                )}
              </p>
              {!isListening && !parsing && !loading && input.trim() && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => parseInputWithAI(input)}
                  className="h-7 text-xs"
                >
                  Parse
                </Button>
              )}
            </div>
          </div>

          {/* Clarification Question */}
          {clarificationQuestion && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  {originalRequest && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-2 italic">
                      Original: "{originalRequest}"
                    </div>
                  )}
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Need more information
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    {clarificationQuestion}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    💡 Type your answer above and press Enter
                  </div>
                </div>
              </div>
            </div>
          )}

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
                disabled={loadingCalendars || loading}
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
          {preview && preview.title && (
            <div className="p-4 bg-accent rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Event Preview</span>
                {preview.confidence && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    preview.confidence === 'high'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : preview.confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {preview.confidence} confidence
                  </span>
                )}
              </div>

              {preview.explanation && (
                <div className="text-xs text-muted-foreground italic pb-2 border-b border-border/50">
                  {preview.explanation}
                </div>
              )}

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="font-medium">{preview.title}</div>
                </div>

                {/* Time */}
                {preview.startTime && preview.endTime && (
                  <div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Time
                    </div>
                    <div className="text-sm">
                      {formatDate(preview.startTime)} → {formatDate(preview.endTime)}
                    </div>
                  </div>
                )}

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
                      Attendees
                    </div>
                    <div className="text-sm">
                      {preview.attendees.join(', ')}
                    </div>
                  </div>
                )}

                {/* Description */}
                {preview.description && (
                  <div>
                    <div className="text-sm text-muted-foreground">Description</div>
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
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !preview || !preview.title || !preview.startTime || clarificationQuestion !== null}
            >
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
