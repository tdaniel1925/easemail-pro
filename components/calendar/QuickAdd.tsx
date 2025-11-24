/**
 * Quick Add Component - GPT-4o Powered Chatbot
 * Natural language event creation with conversational AI
 * Enhanced UX with success screens, better previews, and improved interactions
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Calendar, Clock, MapPin, Mic, MicOff, Users, Send, Bot, User, CheckCircle2, AlertCircle, X, Edit2, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<any>(null);
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null);

  // Edit mode
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Calendar selection
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
      }
    };
  }, [autoCloseTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter to create event
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && preview && !loading && !showSuccess) {
        e.preventDefault();
        handleCreate();
      }
      // Escape to cancel (only if not in success screen)
      if (e.key === 'Escape' && !showSuccess) {
        handleClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, preview, loading, showSuccess]);

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
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[QuickAdd] Sending to AI:', messageText);
      console.log('[QuickAdd] Client timezone:', userTimezone);

      const response = await fetch('/api/calendar/parse-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: messageText,
          conversationHistory,
          timezone: userTimezone,
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
        console.log('[QuickAdd] AI returned event data:', {
          rawStartTime: data.event.startTime,
          rawEndTime: data.event.endTime,
          explanation: data.explanation,
        });

        const startTime = new Date(data.event.startTime);
        const endTime = new Date(data.event.endTime);

        console.log('[QuickAdd] Parsed dates:', {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          startTimeLocal: startTime.toLocaleString(),
          endTimeLocal: endTime.toLocaleString(),
        });

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

          // Show success screen instead of closing immediately
          setCreatedEvent({
            ...data.event,
            title: preview.title,
            startTime: preview.startTime,
            endTime: preview.endTime,
            location: preview.location,
          });
          setShowSuccess(true);
          onEventCreated(); // Refresh calendar in background

          // Auto-close after 3 seconds
          const timer = setTimeout(() => {
            handleClose();
          }, 3000);
          setAutoCloseTimer(timer);
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

    // Clear auto-close timer
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      setAutoCloseTimer(null);
    }

    setInput('');
    setMessages([]);
    setPreview(null);
    setError(null);
    setConversationHistory([]);
    setShowSuccess(false);
    setCreatedEvent(null);
    setEditingField(null);
    onClose();
  };

  const handleStartOver = () => {
    setMessages([]);
    setPreview(null);
    setError(null);
    setConversationHistory([]);
    setEditingField(null);
  };

  const handleEditField = (field: string, currentValue: any) => {
    setEditingField(field);
    setEditValue(String(currentValue || ''));
  };

  const handleSaveEdit = () => {
    if (!editingField || !preview) return;

    const newPreview = { ...preview };

    if (editingField === 'title') {
      newPreview.title = editValue;
    } else if (editingField === 'location') {
      newPreview.location = editValue;
    } else if (editingField === 'description') {
      newPreview.description = editValue;
    }

    setPreview(newPreview);
    setEditingField(null);
    setEditValue('');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const formatDate = (date: Date) => {
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

  const formatTime = (date: Date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          {/* Success Screen */}
          {showSuccess && createdEvent && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
              <div className="relative mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500 animate-bounce">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                {/* Celebration effect */}
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
              </div>

              <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                Event Created Successfully!
              </h3>

              <p className="text-muted-foreground mb-6 max-w-md">
                {createdEvent.title} has been added to your calendar
              </p>

              <div className="bg-accent/50 rounded-lg p-4 mb-6 space-y-2 text-sm max-w-md w-full">
                <div className="flex items-center gap-2 text-left">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">{formatDate(new Date(createdEvent.startTime))}</span>
                </div>
                {createdEvent.location && (
                  <div className="flex items-center gap-2 text-left">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{createdEvent.location}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} size="lg">
                  Close
                </Button>
                <Button onClick={() => {
                  handleClose();
                  // Could add navigation to calendar view here
                }} size="lg">
                  View in Calendar
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Closing automatically in a few seconds...
              </p>
            </div>
          )}

          {/* Main Interface (hidden when success is shown) */}
          {!showSuccess && (
            <>
              {/* Sticky Error Display */}
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setError(null)}
                      aria-label="Dismiss error"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                    <div>
                      <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium mb-2">Hi! Describe the event you'd like to create.</p>
                      <p className="text-xs mt-1 text-muted-foreground/70">
                        For example: "Team meeting tomorrow at 2pm for 1 hour"
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center mt-4">
                        <button
                          onClick={() => setInput('Lunch with Sarah tomorrow at noon')}
                          className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 rounded-full transition-colors"
                        >
                          Lunch meeting
                        </button>
                        <button
                          onClick={() => setInput('Team standup every weekday at 9am')}
                          className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 rounded-full transition-colors"
                        >
                          Recurring meeting
                        </button>
                        <button
                          onClick={() => setInput('Doctor appointment next Tuesday at 3pm')}
                          className="px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 rounded-full transition-colors"
                        >
                          Appointment
                        </button>
                      </div>
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
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-accent text-accent-foreground rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <p className="text-sm">Thinking...</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Enhanced Event Preview */}
              {preview && preview.title && (
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg space-y-3 mb-4 border-2 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Event Preview</span>
                      {preview.confidence && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
                    {messages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartOver}
                        className="h-7 gap-1.5"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Start Over
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {/* Title */}
                    <div className="group">
                      {editingField === 'title' ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 p-2 rounded hover:bg-accent/50 transition-colors">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Title</p>
                            <p className="font-semibold text-base">{preview.title}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditField('title', preview.title)}
                            aria-label="Edit title"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Time */}
                    {preview.startTime && preview.endTime && (
                      <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                        <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="flex-1 text-sm">
                          <p className="font-medium">{formatDate(preview.startTime)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(preview.startTime)} → {formatTime(preview.endTime)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    {editingField === 'location' ? (
                      <div className="flex gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Add location"
                          className="text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
                      </div>
                    ) : preview.location ? (
                      <div className="group flex items-center justify-between gap-2 p-2 rounded hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-2 flex-1">
                          <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                          <p className="text-sm">{preview.location}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditField('location', preview.location)}
                          aria-label="Edit location"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs justify-start gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditField('location', '')}
                      >
                        <MapPin className="h-3 w-3" />
                        Add location
                      </Button>
                    )}

                    {/* Attendees */}
                    {preview.attendees && preview.attendees.length > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                        <Users className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="text-sm">{preview.attendees.join(', ')}</p>
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
                    className="w-full px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs focus:ring-2 focus:ring-primary focus:border-primary"
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
                      aria-label="Event description input"
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
                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
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
                    aria-label="Send message"
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
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center justify-between">
                  <span>Press Enter to send</span>
                  {preview && (
                    <span>Press Cmd/Ctrl+Enter to create</span>
                  )}
                </p>
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
                  className="min-w-[120px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Event'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
