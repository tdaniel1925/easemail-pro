/**
 * Custom URL Input Dialog
 * 
 * Theme-consistent modal for entering URLs
 * Replaces browser prompt() for better UX
 */

'use client';

import { useState } from 'react';
import { Link as LinkIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface URLInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  title?: string;
  placeholder?: string;
}

export function URLInputDialog({
  isOpen,
  onClose,
  onSubmit,
  title = 'Enter URL',
  placeholder = 'https://example.com',
}: URLInputDialogProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    // Basic URL validation
    try {
      new URL(url.trim());
      onSubmit(url.trim());
      setUrl('');
      setError('');
      onClose();
    } catch {
      setError('Please enter a valid URL');
    }
  };

  const handleClose = () => {
    setUrl('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 [&>button]:hidden">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              <h2 className="text-lg font-semibold">{title}</h2>
            </div>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <Label htmlFor="url" className="text-sm font-medium mb-2 block">
              URL
            </Label>
            <Input
              id="url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError('');
              }}
              placeholder={placeholder}
              autoFocus
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-xs text-destructive mt-1">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              Insert Link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

