'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Calendar } from 'lucide-react';

interface ScheduledSendPickerProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: Date) => void;
}

export function ScheduledSendPicker({ open, onClose, onSchedule }: ScheduledSendPickerProps) {
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');

  const scheduleOptions = [
    {
      label: 'Later today (6 PM)',
      getDate: () => {
        const d = new Date();
        d.setHours(18, 0, 0, 0);
        return d > new Date() ? d : new Date(d.getTime() + 24 * 60 * 60 * 1000);
      }
    },
    {
      label: 'Tomorrow morning (9 AM)',
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(9, 0, 0, 0);
        return d;
      }
    },
    {
      label: 'Tomorrow afternoon (2 PM)',
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(14, 0, 0, 0);
        return d;
      }
    },
    {
      label: 'Monday morning (9 AM)',
      getDate: () => {
        const d = new Date();
        const daysUntilMonday = (1 - d.getDay() + 7) % 7 || 7;
        d.setDate(d.getDate() + daysUntilMonday);
        d.setHours(9, 0, 0, 0);
        return d;
      }
    },
  ];

  const handleSchedule = (getDate: () => Date) => {
    const scheduledDate = getDate();
    onSchedule(scheduledDate);
    onClose();
  };

  const handleCustomSchedule = () => {
    if (!customDate || !customTime) {
      alert('Please select both date and time');
      return;
    }

    const scheduledDate = new Date(`${customDate}T${customTime}`);

    if (scheduledDate <= new Date()) {
      alert('Scheduled time must be in the future');
      return;
    }

    onSchedule(scheduledDate);
    onClose();
  };

  // Set default to tomorrow 9 AM
  const getDefaultDateTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const dateStr = tomorrow.toISOString().split('T')[0];
    const timeStr = '09:00';

    return { dateStr, timeStr };
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Set defaults when opening
      const { dateStr, timeStr } = getDefaultDateTime();
      setCustomDate(dateStr);
      setCustomTime(timeStr);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Send
          </DialogTitle>
          <DialogDescription>
            Choose when to send this email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Options */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Schedule</Label>
            <div className="space-y-2">
              {scheduleOptions.map((option, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleSchedule(option.getDate)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date/Time */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Custom Schedule</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="custom-date" className="text-xs text-muted-foreground">
                  Date
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="custom-date"
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-time" className="text-xs text-muted-foreground">
                  Time
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="custom-time"
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleCustomSchedule}
              className="w-full"
              disabled={!customDate || !customTime}
            >
              Schedule for {customDate && customTime &&
                new Date(`${customDate}T${customTime}`).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })
              }
            </Button>
          </div>

          {/* Cancel */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
