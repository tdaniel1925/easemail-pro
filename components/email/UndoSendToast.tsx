'use client';

import { useState, useEffect } from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UndoSendToastProps {
  onUndo: () => void;
  onComplete: () => void;
  duration?: number; // in milliseconds
}

export function UndoSendToast({
  onUndo,
  onComplete,
  duration = 5000
}: UndoSendToastProps) {
  const [timeLeft, setTimeLeft] = useState(duration / 1000);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.1) {
          clearInterval(interval);
          if (!cancelled) {
            onComplete();
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [cancelled, onComplete]);

  const handleUndo = () => {
    setCancelled(true);
    onUndo();
  };

  const progress = (timeLeft / (duration / 1000)) * 100;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[320px] animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="text-sm font-medium">Sending email...</p>
            <p className="text-xs text-muted-foreground">
              {timeLeft.toFixed(1)}s remaining
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleUndo}
          className="gap-2"
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
