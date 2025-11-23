/**
 * Calendar Assistant V2 - Powered by Vercel AI SDK
 * Modern, streaming AI chat interface for calendar management
 */

'use client';

import { useChat } from '@ai-sdk/react';
import { Send, Sparkles, Calendar, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState } from 'react';

interface CalendarAssistantV2Props {
  accountId: string;
  onEventCreated?: (event: any) => void;
}

export function CalendarAssistantV2({
  accountId,
  onEventCreated,
}: CalendarAssistantV2Props) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  // 🎯 useChat hook handles ALL the complexity:
  // - Message state management
  // - API calls with streaming
  // - Tool execution
  // - Error handling
  // - Loading states
  const {
    messages,
    setMessages,
    sendMessage,
    stop,
    status,
    error,
  } = useChat({
    api: '/api/ai/calendar-chat',
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hi! I'm your calendar assistant. I can help you create events, check your schedule, and manage your calendar. What would you like to do?",
      },
    ],
    body: {
      accountId,
    },
    onToolCall: ({ toolCall }) => {
      console.log('[Calendar Assistant V2] Tool called:', toolCall.toolName, toolCall.args);
    },
    onFinish: (message) => {
      console.log('[Calendar Assistant V2] Response finished:', message);

      // Check if event was created (look for tool results in message)
      if (message.toolInvocations) {
        const createEventCall = message.toolInvocations.find(
          (inv: any) => inv.toolName === 'createEvent' && inv.result?.success
        );

        if (createEventCall) {
          console.log('[Calendar Assistant V2] Event created successfully');
          onEventCreated?.(createEventCall.result.event);
        }
      }
    },
  });

  // Derive loading state from chat status
  const isLoading = status === 'loading' || status === 'streaming';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Use sendMessage from useChat to add the message
    await sendMessage({ text: userMessage });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Calendar Assistant V2</h3>
          <p className="text-xs text-muted-foreground">AI-powered scheduling</p>
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

                {/* Show tool invocations (createEvent, getEvents) */}
                {message.toolInvocations && message.toolInvocations.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.toolInvocations.map((toolInvocation: any) => (
                      <div
                        key={toolInvocation.toolCallId}
                        className="text-xs p-2 rounded bg-background/50 border border-border"
                      >
                        {toolInvocation.state === 'result' && (
                          <>
                            {toolInvocation.toolName === 'createEvent' && (
                              <div className="flex items-start gap-2">
                                {toolInvocation.result.success ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-medium text-green-700 dark:text-green-400">
                                        Event created successfully
                                      </p>
                                      <p className="text-muted-foreground mt-1">
                                        "{toolInvocation.result.event.title}" on {toolInvocation.result.event.calendar}
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-medium text-red-700 dark:text-red-400">
                                        Failed to create event
                                      </p>
                                      <p className="text-muted-foreground mt-1">
                                        {toolInvocation.result.error}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}

                            {toolInvocation.toolName === 'getEvents' && (
                              <div className="flex items-start gap-2">
                                {toolInvocation.result.success ? (
                                  <>
                                    <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-medium">
                                        Found {toolInvocation.result.count} events
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="font-medium text-red-700 dark:text-red-400">
                                        Failed to fetch events
                                      </p>
                                      <p className="text-muted-foreground mt-1">
                                        {toolInvocation.result.error}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs opacity-60 mt-1">
                  {new Date(message.createdAt || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
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

          {/* Error message */}
          {error && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-white" />
              </div>
              <div className="bg-red-50 dark:bg-red-950 rounded-lg px-4 py-2 text-sm text-red-900 dark:text-red-100">
                <p className="font-medium">Error</p>
                <p className="text-xs mt-1">{error instanceof Error ? error.message : 'An error occurred'}</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
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
