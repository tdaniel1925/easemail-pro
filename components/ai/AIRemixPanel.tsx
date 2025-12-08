/**
 * AI Remix Panel Component
 *
 * Transform existing email drafts with AI
 * Supports: tone and length adjustment
 * Automatically applies grammar, clarity, conciseness, and flow fixes
 */

'use client';

import { useState, useEffect } from 'react';
import { Wand2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { ToneType } from '@/lib/ai/ai-write-types';
import { createClient } from '@/lib/supabase/client';

interface AIRemixPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onApply: (newContent: string) => void;
}

type LengthAdjustment = 'shorter' | 'same' | 'longer';

export function AIRemixPanel({
  isOpen,
  onClose,
  currentContent,
  onApply,
}: AIRemixPanelProps) {
  const [tone, setTone] = useState<ToneType>('professional');
  const [length, setLength] = useState<LengthAdjustment>('same');
  const [isRemixing, setIsRemixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get authenticated user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  const handleRemix = async () => {
    setIsRemixing(true);
    setError(null);

    // Check authentication
    if (!userId) {
      setError('Please log in to use AI Remix');
      setIsRemixing(false);
      return;
    }

    try {
      const response = await fetch('/api/ai/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          content: currentContent,
          options: {
            tone,
            lengthAdjustment: length,
            style: 'paragraph', // Always use paragraphs
            fixes: ['grammar', 'clarity', 'conciseness', 'flow'], // Always apply all fixes
            variationCount: 1,
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to remix email');
      }

      const data = await response.json();
      onApply(data.email.body);
      onClose();
    } catch (error: any) {
      console.error('Remix error:', error);
      setError(error.message || 'Failed to remix email');
    } finally {
      setIsRemixing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto p-0 [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>AI Remix - Transform Email</DialogTitle>
          <DialogDescription>
            Transform your draft with different tones, lengths, and styles
          </DialogDescription>
        </VisuallyHidden>

        {/* Header */}
        <div className="bg-card border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">AI Remix</h2>
                <p className="text-xs text-muted-foreground">Transform your draft</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Tone Adjustment */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Tone
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['professional', 'friendly', 'casual', 'assertive', 'empathetic'] as ToneType[]).map((t) => (
                <Button
                  key={t}
                  variant={tone === t ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 text-xs capitalize"
                  onClick={() => setTone(t)}
                >
                  {t.slice(0, 4)}
                </Button>
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <label className="block text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              Length
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="2"
                value={length === 'shorter' ? 0 : length === 'same' ? 1 : 2}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setLength(val === 0 ? 'shorter' : val === 1 ? 'same' : 'longer');
                }}
                className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs font-medium w-16 text-right">
                {length === 'shorter' && 'Shorter'}
                {length === 'same' && 'Same'}
                {length === 'longer' && 'Longer'}
              </span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-3 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleRemix}
              disabled={isRemixing}
              size="sm"
            >
              {isRemixing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Remixing
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  Apply
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
