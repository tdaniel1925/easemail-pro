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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Ban, Loader2 } from 'lucide-react';

interface BlockSenderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  senderEmail: string;
  senderName?: string;
  accountId: string;
  onSuccess?: () => void;
}

export function BlockSenderDialog({
  isOpen,
  onClose,
  senderEmail,
  senderName,
  accountId,
  onSuccess,
}: BlockSenderDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [deleteExisting, setDeleteExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlock = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/email/block-sender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          senderEmail,
          senderName,
          deleteExisting,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to block sender');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to block sender');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Block Sender
          </DialogTitle>
          <DialogDescription>
            Block all future emails from this sender. They won&apos;t know they&apos;ve been blocked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm font-medium">{senderName || senderEmail}</p>
            {senderName && (
              <p className="text-xs text-muted-foreground">{senderEmail}</p>
            )}
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="deleteExisting"
              checked={deleteExisting}
              onCheckedChange={(checked) => setDeleteExisting(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="deleteExisting" className="text-sm font-medium cursor-pointer">
                Delete existing emails from this sender
              </Label>
              <p className="text-xs text-muted-foreground">
                Move all emails from {senderEmail} to trash
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBlock}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Blocking...
              </>
            ) : (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Block Sender
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
