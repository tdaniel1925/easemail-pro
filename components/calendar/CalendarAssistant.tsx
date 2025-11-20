/**
 * Calendar Assistant Chatbot
 * AI-powered chat interface for creating events and querying calendar
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CalendarAssistantProps {
  accountId: string;
  selectedCalendarId?: string;
  onEventCreated?: (event: any) => void;
}

export function CalendarAssistant({
  accountId,
  selectedCalendarId,
  onEventCreated,
}: CalendarAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your calendar assistant. I can help you create events, check your schedule, find conflicts, and answer questions about your calendar. What would you like to do?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Step 1: Detect intent (create event vs. query calendar)
      const intentResponse = await fetch('/api/calendar/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: userMessage.content,
          accountId,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const intentData = await intentResponse.json();

      if (!intentData.success) {
        throw new Error(intentData.error || 'Failed to process request');
      }

      // Step 2: Route based on intent
      if (intentData.intent === 'create_event') {
        // Use existing parse-event API for event creation
        const parseResponse = await fetch('/api/calendar/parse-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: userMessage.content,
            conversationHistory: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        const parseData = await parseResponse.json();

        if (parseData.success && parseData.needsClarification) {
          // AI needs more info
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: parseData.question,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
        } else if (parseData.success && parseData.event) {
          // Event parsed successfully - create it
          const createResponse = await fetch('/api/nylas-v3/calendars/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId,
              calendarId: selectedCalendarId || parseData.event.calendarId,
              title: parseData.event.title,
              description: parseData.event.description,
              location: parseData.event.location,
              when: {
                start_time: Math.floor(new Date(parseData.event.startTime).getTime() / 1000),
                end_time: Math.floor(new Date(parseData.event.endTime).getTime() / 1000),
              },
              participants: parseData.event.attendees?.map((email: string) => ({
                email,
                status: 'noreply',
              })) || [],
            }),
          });

          const createData = await createResponse.json();

          if (createData.success) {
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `✅ Event created! "${parseData.event.title}" has been added to your calendar.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            onEventCreated?.(createData.event);
          } else {
            throw new Error(createData.error || 'Failed to create event');
          }
        }
      } else {
        // Query mode - display assistant's response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: intentData.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('[CalendarAssistant] Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Calendar Assistant</h3>
          <p className="text-xs text-muted-foreground">AI-powered scheduling help</p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your calendar..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Try: "What do I have tomorrow?" or "Schedule lunch with John on Friday at noon"
        </p>
      </form>
    </div>
  );
}
