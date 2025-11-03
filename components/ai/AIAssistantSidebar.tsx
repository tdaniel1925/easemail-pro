'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles, X, Send, Loader2, Bot, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: Array<{ text: string; action: string; path?: string }>;
}

interface AIAssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  fullPage?: boolean; // NEW: When true, renders as full page instead of sliding sidebar
}

export function AIAssistantSidebar({ isOpen, onClose, fullPage = false }: AIAssistantSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI assistant. I know everything about EaseMail and can help you with:\n\n• How to use any feature\n• Step-by-step instructions\n• Troubleshooting issues\n• Finding settings\n• Keyboard shortcuts\n\nWhat would you like help with?',
      actions: [
        { text: 'Connect Email Account', action: 'navigate', path: '/inbox' },
        { text: 'Use AI Write', action: 'navigate', path: '/inbox?compose=true' },
        { text: 'Create Rules', action: 'navigate', path: '/rules' },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get conversation history (last 10 messages)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
          currentPage: pathname,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.response,
            actions: data.actions,
          },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: 'I apologize, but I encountered an error. Please try asking your question again.',
          },
        ]);
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I\'m having trouble connecting right now. Please check your internet connection and try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: string, path?: string) => {
    if (action === 'navigate' && path) {
      router.push(path);
      if (!fullPage) {
        onClose();
      }
    }
  };

  const quickSuggestions = getQuickSuggestions(pathname);

  if (!isOpen) return null;

  // Full page render (for right sidebar tab)
  if (fullPage) {
    return (
      <div className="h-full w-full bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bot className="h-6 w-6 text-primary" />
              <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Ask me anything about EaseMail</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                
                {/* Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.actions.map((action, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(action.action, action.path)}
                        className="text-xs bg-background hover:bg-background/80"
                      >
                        {action.text}
                        {action.action === 'navigate' && (
                          <ChevronRight className="ml-1 h-3 w-3" />
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions */}
        {quickSuggestions.length > 0 && messages.length <= 2 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">💡 Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Powered by GPT-4 • Knows your entire system
          </p>
        </form>
      </div>
    );
  }

  // Sliding sidebar render (original)
  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l border-border shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="h-6 w-6 text-primary" />
            <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">AI Assistant</h2>
            <p className="text-xs text-muted-foreground">Ask me anything about EaseMail</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-background/80"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">{message.content}</div>
              
              {/* Action Buttons */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.actions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(action.action, action.path)}
                      className="text-xs bg-background hover:bg-background/80"
                    >
                      {action.text}
                      {action.action === 'navigate' && (
                        <ChevronRight className="ml-1 h-3 w-3" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      {quickSuggestions.length > 0 && messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">💡 Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {quickSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => setInput(suggestion)}
                className="text-xs px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-background">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Powered by GPT-4 • Knows your entire system
        </p>
      </form>
    </div>
  );
}

/**
 * Get contextual quick suggestions based on current page
 */
function getQuickSuggestions(pathname: string): string[] {
  const baseQuestions = [
    'How do I use AI to write emails?',
    'How do I connect my Gmail?',
    'How do I create email rules?',
  ];

  if (pathname === '/inbox' || pathname === '/') {
    return [
      'How do I compose an email?',
      'How do I use AI Write?',
      'How do I archive emails?',
    ];
  }

  if (pathname === '/contacts') {
    return [
      'How do I add contacts?',
      'How do I send SMS?',
      'How do I import contacts?',
    ];
  }

  if (pathname === '/calendar') {
    return [
      'How do I create events?',
      'How do I set reminders?',
      'How do I create recurring events?',
    ];
  }

  if (pathname === '/settings') {
    return [
      'How do I add a signature?',
      'How do I change my theme?',
      'How do I enable notifications?',
    ];
  }

  if (pathname === '/rules') {
    return [
      'How do email rules work?',
      'How do I auto-archive emails?',
      'How do I create smart filters?',
    ];
  }

  return baseQuestions;
}
