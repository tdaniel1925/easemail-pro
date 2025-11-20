/**
 * AI-Powered Quick Add Component
 * Natural language event creation with intelligent parsing and conversational clarification
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Calendar, Clock, MapPin, Mic, MicOff, Users, Send, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as Sentry from '@sentry/nextjs';

interface QuickAddProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ParsedEvent {
  title: string;
  startTime: string;
  endTime: string;
  location?: string | null;
  description?: string | null;
  attendees?: string[];
}

export default function QuickAdd({ isOpen, onClose, onEventCreated }: QuickAddProps) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<ParsedEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [browserSupportsVoice, setBrowserSupportsVoice] = useState(false);

  // Conversation state for clarifications
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('medium');

  const chatEndRef = useRef<HTMLDivElement>(null);

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

              // Parse with AI when final
              if (event.results[0].isFinal) {
                parseWithAI(transcript);
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

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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

  const parseWithAI = async (text: string, isFollowUp: boolean = false) => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[QuickAdd AI] Parsing:', text);
      console.log('[QuickAdd AI] Conversation history:', conversationHistory);

      const response = await fetch('/api/calendar/parse-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          conversationHistory: isFollowUp ? conversationHistory : [],
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse event');
      }

      console.log('[QuickAdd AI] Parse result:', data);

      // Update conversation history
      const newHistory = [
        ...conversationHistory,
        { role: 'user', content: text },
      ];

      if (data.needsClarification) {
        // AI needs more information - show chat modal
        setAiQuestion(data.question);
        setChatMessages(prev => [
          ...prev,
          { role: 'user', content: text },
          { role: 'assistant', content: data.question },
        ]);
        setConversationHistory([
          ...newHistory,
          { role: 'assistant', content: data.question },
        ]);
        setShowChat(true);

        // Show partial preview if available
        if (data.partialEvent) {
          const partial: any = {};
          if (data.partialEvent.title) partial.title = data.partialEvent.title;
          if (data.partialEvent.startTime) partial.startTime = data.partialEvent.startTime;
          if (data.partialEvent.endTime) partial.endTime = data.partialEvent.endTime;
          if (data.partialEvent.location) partial.location = data.partialEvent.location;

          if (Object.keys(partial).length > 0) {
            setPreview(partial);
          }
        }
      } else {
        // AI has enough information - show preview
        setPreview(data.event);
        setConfidence(data.confidence || 'medium');
        setConversationHistory([
          ...newHistory,
          { role: 'assistant', content: JSON.stringify(data.event) },
        ]);

        // Add success message to chat if chat is open
        if (showChat || isFollowUp) {
          setChatMessages(prev => [
            ...prev,
            { role: 'user', content: text },
            { role: 'assistant', content: data.explanation || 'Got it! Here\'s your event preview.' },
          ]);
        }
      }

    } catch (err: any) {
      console.error('[QuickAdd AI] Parse error:', err);
      Sentry.captureException(err);
      setError(err.message || 'Failed to parse event. Please try rephrasing.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      parseWithAI(input, showChat);
    }
  };

  const handleChatResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      parseWithAI(input, true);
      setInput('');
    }
  };

  const handleCreate = async () => {
    if (!preview) return;

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      console.log('[QuickAdd] Creating event:', preview);

      await Sentry.startSpan(
        {
          op: 'calendar.event.create',
          name: 'AI Quick Add Event Creation',
        },
        async (span) => {
          span.setAttribute('title', preview.title);
          span.setAttribute('confidence', confidence);
          span.setAttribute('hadConversation', chatMessages.length > 0);

          const response = await fetch('/api/calendar/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: preview.title,
              description: preview.description || null,
              startTime: preview.startTime,
              endTime: preview.endTime,
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
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
    setInput('');
    setPreview(null);
    setError(null);
    setShowChat(false);
    setChatMessages([]);
    setConversationHistory([]);
    setAiQuestion(null);
    setConfidence('medium');
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Quick Add Event
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Initial Input (always visible) */}
          {!showChat && (
            <form onSubmit={handleInputSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Describe your event naturally
                </label>
                <div className="relative">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder='e.g., "Friday at 12am for 2 hours", "Meeting tomorrow at 3pm for 90 minutes"'
                    className="text-base pr-12"
                    autoFocus
                    disabled={loading}
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
                    <span className="text-red-500 font-medium">🎤 Listening...</span>
                  ) : loading ? (
                    <span className="text-blue-500 font-medium flex items-center gap-1">
                      <Bot className="h-3 w-3 animate-pulse" />
                      AI is understanding your request...
                    </span>
                  ) : (
                    <>AI understands durations, complex times, and will ask if clarification is needed</>
                  )}
                </p>
              </div>
            </form>
          )}

          {/* Chat Modal for Clarifications */}
          {showChat && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-1">
                  <Bot className="h-4 w-4" />
                  <span className="font-medium">AI Assistant needs clarification</span>
                </div>
                <p className="text-blue-600 dark:text-blue-400 text-xs">
                  Answer the question below to help me understand your event better.
                </p>
              </div>

              {/* Conversation */}
              <div className="border border-border rounded-lg p-4 bg-accent/30 max-h-[300px] overflow-y-auto space-y-3">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-lg max-w-[80%] ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border border-border'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleChatResponse} className="flex gap-2">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Type your answer..."
                  className="flex-1"
                  autoFocus
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
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

          {/* Event Preview */}
          {preview && preview.startTime && preview.endTime && (
            <div className="p-4 bg-accent rounded-lg space-y-3 border-2 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Event Preview</span>
                </div>
                {confidence && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      confidence === 'high'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : confidence === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {confidence === 'high' ? '✓ High confidence' : confidence === 'medium' ? '~ Medium confidence' : '! Low confidence'}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* Title */}
                <div>
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="font-medium">{preview.title}</div>
                </div>

                {/* Time */}
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Time & Duration
                  </div>
                  <div className="text-sm">
                    {formatDate(preview.startTime)} → {formatDate(preview.endTime)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Duration: {Math.round((new Date(preview.endTime).getTime() - new Date(preview.startTime).getTime()) / (1000 * 60))} minutes
                  </div>
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
                    <div className="text-sm text-muted-foreground">Notes</div>
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
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !preview || !preview.startTime || !preview.endTime}
          >
            {loading ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
