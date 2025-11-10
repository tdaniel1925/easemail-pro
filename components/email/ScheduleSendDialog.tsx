'use client';

import { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ScheduleSendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (scheduledTime: Date) => void;
}

const QUICK_TIMES = [
  { label: '1 hour from now', hours: 1 },
  { label: '4 hours from now', hours: 4 },
  { label: 'Tomorrow 9 AM', special: 'tomorrow9am' },
  { label: 'Tomorrow 1 PM', special: 'tomorrow1pm' },
  { label: 'Next Monday 9 AM', special: 'monday9am' },
];

export function ScheduleSendDialog({ isOpen, onClose, onSchedule }: ScheduleSendDialogProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [quickTime, setQuickTime] = useState<string>('');

  const getQuickTime = (option: string): Date => {
    const now = new Date();

    if (option === 'tomorrow9am') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }

    if (option === 'tomorrow1pm') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(13, 0, 0, 0);
      return tomorrow;
    }

    if (option === 'monday9am') {
      const nextMonday = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      nextMonday.setHours(9, 0, 0, 0);
      return nextMonday;
    }

    const hours = parseInt(option);
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return future;
  };

  const handleQuickSchedule = (option: string) => {
    const scheduledTime = getQuickTime(option);
    onSchedule(scheduledTime);
    onClose();
  };

  const handleCustomSchedule = () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select both date and time');
      return;
    }

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const scheduledTime = new Date(selectedDate);
    scheduledTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    if (scheduledTime <= now) {
      alert('Scheduled time must be in the future');
      return;
    }

    onSchedule(scheduledTime);
    onClose();
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMinTime = () => {
    if (!selectedDate) return '00:00';

    const selected = new Date(selectedDate);
    const today = new Date();

    // If selected date is today, minimum time is now + 1 minute
    if (selected.toDateString() === today.toDateString()) {
      today.setMinutes(today.getMinutes() + 1);
      const hours = today.getHours().toString().padStart(2, '0');
      const minutes = today.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    return '00:00';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Send</DialogTitle>
          <DialogDescription>
            Choose when to send this email
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Times */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quick Options</Label>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_TIMES.map((option) => (
                <Button
                  key={option.label}
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    const value = option.special || option.hours?.toString() || '';
                    handleQuickSchedule(value);
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or choose custom time
              </span>
            </div>
          </div>

          {/* Custom Date/Time */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  className="pl-10"
                  min={getMinDate()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  className="pl-10"
                  min={getMinTime()}
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCustomSchedule}>
            Schedule Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
