'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { BellOff, Loader2 } from 'lucide-react';

interface MuteConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  accountId: string;
  subject?: string;
  onSuccess?: () => void;
}

export function MuteConversationDialog({
  isOpen,
  onClose,
  threadId,
  accountId,
  subject,
  onSuccess,
}: MuteConversationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState('forever');
  const [error, setError] = useState<string | null>(null);

  const handleMute = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate muted until date based on duration
      let mutedUntil: string | null = null;
      const now = new Date();

      switch (duration) {
        case '1hour':
          mutedUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
          break;
        case '8hours':
          mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString();
          break;
        case '1day':
          mutedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1week':
          mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'forever':
        default:
          mutedUntil = null; // null = forever
          break;
      }

      const response = await fetch('/api/email/mute-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          threadId,
          mutedUntil,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mute conversation');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mute conversation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Mute Conversation
          </DialogTitle>
          <DialogDescription>
            Stop receiving notifications for this conversation.
            {subject && (
              <span className="block mt-1 text-foreground font-medium truncate">
                &quot;{subject}&quot;
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={duration} onValueChange={setDuration}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1hour" id="1hour" />
              <Label htmlFor="1hour" className="cursor-pointer">For 1 hour</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="8hours" id="8hours" />
              <Label htmlFor="8hours" className="cursor-pointer">For 8 hours</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1day" id="1day" />
              <Label htmlFor="1day" className="cursor-pointer">For 1 day</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1week" id="1week" />
              <Label htmlFor="1week" className="cursor-pointer">For 1 week</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="forever" id="forever" />
              <Label htmlFor="forever" className="cursor-pointer">Until I unmute</Label>
            </div>
          </RadioGroup>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <p className="text-xs text-muted-foreground">
            You can unmute this conversation anytime from the email options menu.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleMute} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Muting...
              </>
            ) : (
              <>
                <BellOff className="mr-2 h-4 w-4" />
                Mute
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
