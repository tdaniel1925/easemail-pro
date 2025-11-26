'use client';

import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { addHours, addDays, setHours, setMinutes, nextMonday } from 'date-fns';

interface SnoozeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSnooze: (snoozeUntil: Date) => void;
  emailSubject?: string;
}

export function SnoozeDialog({
  open,
  onOpenChange,
  onSnooze,
  emailSubject,
}: SnoozeDialogProps) {
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const snoozePresets = [
    {
      label: 'Later today',
      value: () => addHours(new Date(), 3),
      icon: '☀️',
    },
    {
      label: 'Tomorrow',
      value: () => {
        const tomorrow = addDays(new Date(), 1);
        return setMinutes(setHours(tomorrow, 9), 0);
      },
      icon: '🌅',
    },
    {
      label: 'This weekend',
      value: () => {
        const now = new Date();
        const daysUntilSaturday = 6 - now.getDay();
        const saturday = addDays(now, daysUntilSaturday);
        return setMinutes(setHours(saturday, 9), 0);
      },
      icon: '🎉',
    },
    {
      label: 'Next week',
      value: () => {
        const monday = nextMonday(new Date());
        return setMinutes(setHours(monday, 9), 0);
      },
      icon: '📅',
    },
  ];

  const handlePresetClick = (getDate: () => Date) => {
    const snoozeDate = getDate();
    onSnooze(snoozeDate);
    onOpenChange(false);
  };

  const handleCustomSnooze = () => {
    if (!customDate || !customTime) {
      alert('Please select both date and time');
      return;
    }

    const snoozeDate = new Date(`${customDate}T${customTime}`);
    if (snoozeDate <= new Date()) {
      alert('Please select a future date and time');
      return;
    }

    onSnooze(snoozeDate);
    onOpenChange(false);
    setCustomDate('');
    setCustomTime('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Snooze Email
          </DialogTitle>
          <DialogDescription>
            {emailSubject ? (
              <span className="line-clamp-2">
                Choose when you want to be reminded about: <strong>{emailSubject}</strong>
              </span>
            ) : (
              'Choose when you want to be reminded about this email'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {snoozePresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary transition-colors"
              onClick={() => handlePresetClick(preset.value)}
            >
              <span className="text-2xl">{preset.icon}</span>
              <span className="text-sm font-medium">{preset.label}</span>
            </Button>
          ))}
        </div>

        {/* Custom Date/Time */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm font-medium mb-3">Or pick a custom time:</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Date
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Time
              </label>
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button
              onClick={handleCustomSnooze}
              className="w-full"
              disabled={!customDate || !customTime}
            >
              Snooze until {customDate} at {customTime}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
