'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCalendarPro } from '@/contexts/CalendarProContext';
import { Loader2 } from 'lucide-react';

interface QuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuickAdd({ open, onOpenChange }: QuickAddProps) {
  const [input, setInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { grantId, calendars, refreshEvents } = useCalendarPro();

  const parseNaturalLanguage = (text: string) => {
    // Simple parsing - in production, you'd use a more sophisticated parser
    const now = new Date();

    // Default: 1 hour from now
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

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
            <Input
              placeholder="e.g., 'Team meeting tomorrow at 2pm' or 'Lunch with Sarah'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Type naturally - we'll parse the date and time for you
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
