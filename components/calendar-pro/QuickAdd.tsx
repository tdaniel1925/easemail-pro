'use client';

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCalendarPro } from '@/contexts/CalendarProContext';
import { Loader2, Mic, MicOff } from 'lucide-react';

interface QuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTime?: { hour: number; minute: number };
}

export default function QuickAdd({ open, onOpenChange, initialTime }: QuickAddProps) {
  const [input, setInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const { grantId, calendars, refreshEvents, selectedDate } = useCalendarPro();
  const recognitionRef = useRef<any>(null);
  const shouldAutoCreateRef = useRef(false);

  const parseNaturalLanguage = (text: string) => {
    const now = new Date();

    let start: Date;
    let end: Date;

    // If we have initialTime from click-to-create, use it
    if (initialTime) {
      const baseDate = selectedDate || new Date();
      start = new Date(baseDate);
      start.setHours(initialTime.hour, initialTime.minute, 0, 0);
      end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour later
    } else {
      // Default: 1 hour from now
      start = new Date(now.getTime() + 60 * 60 * 1000);
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    // Extract title (everything before time indicators)
    const title = text.split(/\bat\b|\bon\b|\btomorrow\b|\bnext\b/i)[0].trim();

    return {
      title: title || text,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    };
  };

  const handleCreate = async () => {
    if (!input.trim() || !grantId) return;

    setIsCreating(true);
    setError(null);

    try {
      const parsed = parseNaturalLanguage(input);

      // Find primary or first writable calendar
      const primaryCalendar = calendars.find(cal => cal.isPrimary && !cal.readOnly);
      const firstWritable = calendars.find(cal => !cal.readOnly);
      const targetCalendar = primaryCalendar || firstWritable || calendars[0];

      if (!targetCalendar) {
        throw new Error('No calendar available');
      }

      // Create event via Nylas API
      const response = await fetch('/api/nylas-v3/calendars/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: grantId,
          calendarId: targetCalendar.id,
          title: parsed.title,
          when: {
            startTime: Math.floor(new Date(parsed.startTime).getTime() / 1000),
            endTime: Math.floor(new Date(parsed.endTime).getTime() / 1000),
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create event');
      }

      // Refresh events
      await refreshEvents();

      // Close and reset
      setInput('');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to create event:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setIsCreating(false);
      shouldAutoCreateRef.current = false;
    }
  };

  // Initialize speech recognition ONCE on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
        // Mark that we should auto-create after input is set
        shouldAutoCreateRef.current = true;
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setError('Voice input failed. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Auto-create event after voice input completes
  useEffect(() => {
    if (shouldAutoCreateRef.current && input.trim() && !isListening) {
      // Brief delay to show user what was captured
      const timer = setTimeout(() => {
        handleCreate();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [input, isListening]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setError('Voice input not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      shouldAutoCreateRef.current = false;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quick Add Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="relative">
              <Input
                placeholder="e.g., 'Team meeting tomorrow at 2pm' or 'Lunch with Sarah'"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="pr-12"
                disabled={isListening}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={toggleVoiceInput}
                title={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 text-red-500 animate-pulse" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isListening ? 'Listening... Speak now' : 'Type naturally or use voice input - we\'ll parse the date and time for you'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setInput('');
                setError(null);
                shouldAutoCreateRef.current = false;
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !input.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
