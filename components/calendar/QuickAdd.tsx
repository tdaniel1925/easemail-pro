/**
 * Quick Add Component
 * Natural language event creation (e.g., "Meeting tomorrow at 3pm")
 */

'use client';

import { useState } from 'react';
import { Sparkles, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as chrono from 'chrono-node';

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

  const parseInput = (text: string) => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }

    try {
      // Parse the natural language input
      const results = chrono.parse(text, new Date(), { forwardDate: true });
      
      if (results.length === 0) {
        setPreview({
          title: text,
          startTime: new Date(),
          endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
          hasDate: false,
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

      // Extract title (text before the date/time)
      let title = text.substring(0, result.index).trim();
      
      // If no title before date, use text after date
      if (!title) {
        title = text.substring(result.index + result.text.length).trim();
      }
      
      // If still no title, use the whole text
      if (!title) {
        title = text;
      }

      // Clean up common words from title
      title = title.replace(/^(at|on|for|meeting|call|event)\s+/i, '');
      title = title.trim() || 'Untitled Event';

      // Try to extract location (text after "at" or "in")
      const locationMatch = title.match(/\s+(at|in)\s+([^,]+)/i);
      const location = locationMatch ? locationMatch[2].trim() : null;
      
      if (location) {
        title = title.replace(/\s+(at|in)\s+[^,]+/i, '').trim();
      }

      setPreview({
        title,
        startTime,
        endTime,
        location,
        hasDate: true,
      });

    } catch (err) {
      console.error('Parse error:', err);
      setPreview({
        title: text,
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        hasDate: false,
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

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: preview.title,
          startTime: preview.startTime.toISOString(),
          endTime: preview.endTime.toISOString(),
          location: preview.location || null,
          allDay: false,
          color: 'blue',
          reminders: [{ type: 'popup', minutesBefore: 15 }],
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create event');
      }

      onEventCreated();
      handleClose();

    } catch (err: any) {
      console.error('Create error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
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
          {/* Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Describe your event
            </label>
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder='e.g., "Team meeting tomorrow at 2pm" or "Lunch with Sarah Friday noon"'
              className="text-base"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Try: "tomorrow at 3pm", "next Friday 10am", "Monday 9:30am-11am"
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="p-4 bg-accent rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Event Preview</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-sm text-muted-foreground">Title</div>
                  <div className="font-medium">{preview.title}</div>
                </div>

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

                {preview.location && (
                  <div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Location
                    </div>
                    <div className="text-sm">{preview.location}</div>
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

