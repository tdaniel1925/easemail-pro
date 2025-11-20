/**
 * Quick Add Component - GPT-4o Powered Chatbot
 * Natural language event creation with conversational AI
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
  timestamp: Date;
}

export default function QuickAdd({ isOpen, onClose, onEventCreated }: QuickAddProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [browserSupportsVoice, setBrowserSupportsVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calendar selection
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
                handleSendMessage(transcript);
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
      recognition.start();
      setIsListening(true);
    }
  };

  // Send message and parse with AI
  const handleSendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setParsing(true);
    setError(null);

    try {
      console.log('[QuickAdd] Sending to AI:', messageText);

      const response = await fetch('/api/calendar/parse-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: messageText,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to parse event');
      }

      console.log('[QuickAdd] AI response:', data);

      if (data.needsClarification) {
        // AI needs more information - add assistant message
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.question,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update conversation history
        setConversationHistory([
          ...conversationHistory,
          { role: 'user', content: messageText },
          { role: 'assistant', content: data.question },
        ]);

        // Show partial event preview if available
        if (data.partialEvent && data.partialEvent.startTime) {
          try {
            const startTime = new Date(data.partialEvent.startTime);
            const endTime = data.partialEvent.endTime ? new Date(data.partialEvent.endTime) : null;

            if (!isNaN(startTime.getTime())) {
              setPreview({
                title: data.partialEvent.title || null,
                startTime,
                endTime: endTime && !isNaN(endTime.getTime()) ? endTime : null,
                location: data.partialEvent.location || null,
                description: null,
                attendees: [],
                confidence: 'low',
              });
            } else {
              setPreview(null);
            }
          } catch (err) {
            console.error('[QuickAdd] Error parsing partial event:', err);
            setPreview(null);
          }
        } else {
          setPreview(null);
        }
      } else {
        // AI successfully parsed the event
        const startTime = new Date(data.event.startTime);
        const endTime = new Date(data.event.endTime);

        // Check if dates are valid
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          throw new Error('Invalid date format returned by AI');
        }

        // Add success message
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.explanation || 'Perfect! I\'ve prepared your event. Ready to create it?',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        setPreview({
          title: data.event.title,
          startTime,
          endTime,
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

      // Add error message to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message}. Could you try rephrasing?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setParsing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim() && !parsing) {
      handleSendMessage();
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

      // Add error to chat
      const errorMessage: Message = {
        role: 'assistant',
        content: `Failed to create event: ${err.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    setMessages([]);
    setPreview(null);
    setError(null);
    setConversationHistory([]);
    onClose();
  };

  const formatDate = (date: Date) => {
    // Ensure date is a Date object and is valid
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date';
    }

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
      <DialogContent className="max-w-2xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Add Event
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Hi! Describe the event you'd like to create.</p>
                  <p className="text-xs mt-1">For example: "Team meeting tomorrow at 2pm for 1 hour"</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent text-accent-foreground'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {parsing && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div className="bg-accent text-accent-foreground rounded-lg px-4 py-2.5">
                      <p className="text-sm">Thinking...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Event Preview */}
          {preview && preview.title && (
            <div className="p-3 bg-accent/50 rounded-lg space-y-2 mb-4 border border-border">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Event Preview</span>
                {preview.confidence && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    preview.confidence === 'high'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : preview.confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}>
                    {preview.confidence}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Title:</span>
                  <p className="font-medium">{preview.title}</p>
                </div>
                {preview.startTime && preview.endTime && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Time:
                    </span>
                    <p className="text-xs">
                      {formatDate(preview.startTime)} → {preview.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
                {preview.location && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Location:
                    </span>
                    <p>{preview.location}</p>
                  </div>
                )}
                {preview.attendees && preview.attendees.length > 0 && (
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Attendees:
                    </span>
                    <p>{preview.attendees.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Selector */}
          {availableCalendars.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                Calendar
              </label>
              <select
                value={selectedCalendarId}
                onChange={(e) => setSelectedCalendarId(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs"
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

          {/* Input Area */}
          <div className="border-t pt-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={messages.length === 0 ? "Describe your event..." : "Type your answer..."}
                  className="pr-10"
                  disabled={parsing || loading}
                  autoFocus
                />
                {browserSupportsVoice && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={toggleVoiceInput}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 ${
                      isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground'
                    }`}
                    disabled={parsing || loading}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || parsing || loading}
                size="icon"
                className="h-10 w-10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {isListening && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Listening...
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading} size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={loading || !preview || !preview.title || !preview.startTime}
              size="sm"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
