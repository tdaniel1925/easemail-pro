'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface SnoozePickerProps {
  open: boolean;
  onClose: () => void;
  onSnooze: (until: Date) => Promise<void>;
}

export function SnoozePicker({ open, onClose, onSnooze }: SnoozePickerProps) {
  const [loading, setLoading] = useState(false);

  const snoozeOptions = [
    { label: 'Later today (6 PM)', hours: () => {
      const d = new Date();
      d.setHours(18, 0, 0, 0);
      return d > new Date() ? d : new Date(d.getTime() + 24 * 60 * 60 * 1000);
    }},
    { label: 'Tomorrow (9 AM)', hours: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    }},
    { label: 'This weekend (Saturday 9 AM)', hours: () => {
      const d = new Date();
      const daysUntilSaturday = (6 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilSaturday);
      d.setHours(9, 0, 0, 0);
      return d;
    }},
    { label: 'Next week (Monday 9 AM)', hours: () => {
      const d = new Date();
      const daysUntilMonday = (1 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilMonday);
      d.setHours(9, 0, 0, 0);
      return d;
    }},
  ];

  const handleSnooze = async (getDate: () => Date) => {
    setLoading(true);
    try {
      await onSnooze(getDate());
      onClose();
    } catch (error) {
      console.error('Snooze error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Snooze Email</DialogTitle>
          <DialogDescription>
            Hide this email until a specific time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {snoozeOptions.map((option, idx) => (
            <Button
              key={idx}
              variant="outline"
              className="w-full justify-start"
              onClick={() => handleSnooze(option.hours)}
              disabled={loading}
            >
              <Clock className="h-4 w-4 mr-2" />
              {option.label}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

