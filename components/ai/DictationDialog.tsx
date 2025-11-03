/**
 * Dictation Complete Dialog
 * 
 * Smart post-dictation flow:
 * - Shows preview of dictated text
 * - Choice: Use As-Is vs AI Polish
 * - Shows before/after comparison for AI Polish
 * - Remembers user preference
 */

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Sparkles, Loader2, ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface DictationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dictatedText: string;
  onUseAsIs: (text: string) => void;
  onUsePolished: (subject: string, body: string) => void;
  recipientName?: string;
}

type Step = 'choice' | 'polishing' | 'comparison';
type DictationPreference = 'always_as_is' | 'always_polish' | 'ask_every_time';

const STORAGE_KEY = 'easemail_dictation_preference';

export function DictationDialog({
  isOpen,
  onClose,
  dictatedText,
  onUseAsIs,
  onUsePolished,
  recipientName,
}: DictationDialogProps) {
  const [step, setStep] = useState<Step>('choice');
  const [polishedSubject, setPolishedSubject] = useState('');
  const [polishedText, setPolishedText] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<'as_is' | 'polish' | null>(null);

  // Check for saved preference on mount
  useEffect(() => {
    if (!isOpen) return;

    const savedPref = localStorage.getItem(STORAGE_KEY) as DictationPreference | null;
    
    if (savedPref === 'always_as_is') {
      // Auto-insert as-is
      onUseAsIs(dictatedText);
      onClose();
    } else if (savedPref === 'always_polish') {
      // Auto-polish
      handlePolish(true);
    }
    // Otherwise show dialog (ask_every_time or no preference)
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep('choice');
      setPolishedSubject('');
      setPolishedText('');
      setError(null);
      setRememberChoice(false);
      setSelectedChoice(null);
    }
  }, [isOpen]);

  const handlePolish = async (auto: boolean = false) => {
    setIsPolishing(true);
    setError(null);
    setStep('polishing');

    try {
      const response = await fetch('/api/ai/dictation-polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: dictatedText,
          recipientName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to polish dictation');
      }

      const data = await response.json();
      setPolishedSubject(data.subject);
      setPolishedText(data.polishedText);
      
      // If auto-polish (from preference), directly insert
      if (auto && rememberChoice) {
        onUsePolished(data.subject, data.polishedText);
        onClose();
      } else {
        setStep('comparison');
      }
    } catch (err: any) {
      console.error('Polish error:', err);
      setError(err.message || 'Failed to polish text');
      setStep('choice');
    } finally {
      setIsPolishing(false);
    }
  };

  const handleUseAsIs = () => {
    if (rememberChoice) {
      localStorage.setItem(STORAGE_KEY, 'always_as_is');
    }
    onUseAsIs(dictatedText);
    onClose();
  };

  const handleUsePolished = () => {
    if (rememberChoice) {
      localStorage.setItem(STORAGE_KEY, 'always_polish');
    }
    onUsePolished(polishedSubject, polishedText);
    onClose();
  };

  const handleOpenRemix = () => {
    // TODO: Pass polished text to AI Remix panel
    onUsePolished(polishedSubject, polishedText);
    onClose();
  };

  const previewText = dictatedText.length > 150 
    ? dictatedText.substring(0, 150) + '...' 
    : dictatedText;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 [&>button]:hidden">
        {/* STEP 1: Choice */}
        {step === 'choice' && (
          <>
            <div className="bg-primary text-primary-foreground p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6" />
                  <div>
                    <h2 className="text-2xl font-bold">Dictation Complete</h2>
                    <p className="text-sm opacity-90">How would you like to use this text?</p>
                  </div>
                </div>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Preview */}
              <div>
                <label className="block text-sm font-medium mb-2 text-muted-foreground">Preview</label>
                <div className="p-4 border border-border rounded-lg bg-muted/50 text-sm">
                  "{previewText}"
                </div>
              </div>

              {/* Choice Buttons */}
              <div className="grid grid-cols-2 gap-4">
                {/* Use As-Is */}
                <button
                  onClick={handleUseAsIs}
                  className={cn(
                    'p-6 border-2 rounded-lg text-left transition-all hover:border-primary hover:bg-primary/5',
                    'border-border bg-card'
                  )}
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-semibold text-lg mb-1">Use As-Is</div>
                  <div className="text-sm text-muted-foreground">
                    Insert exactly as dictated
                  </div>
                </button>

                {/* AI Polish */}
                <button
                  onClick={() => handlePolish(false)}
                  className={cn(
                    'p-6 border-2 rounded-lg text-left transition-all hover:border-primary hover:bg-primary/5',
                    'border-primary bg-primary/10'
                  )}
                >
                  <div className="text-2xl mb-2">✨</div>
                  <div className="font-semibold text-lg mb-1">AI Polish</div>
                  <div className="text-sm text-muted-foreground">
                    Transform into professional email
                  </div>
                </button>
              </div>

              {/* Remember Choice */}
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Checkbox
                  id="remember"
                  checked={rememberChoice}
                  onCheckedChange={(checked) => setRememberChoice(checked === true)}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Don't ask again (you can change this in Settings)
                </label>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          </>
        )}

        {/* STEP 2: Polishing */}
        {step === 'polishing' && (
          <div className="p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Polishing with AI...</h3>
            <p className="text-sm text-muted-foreground">
              Transforming your dictation into a professional email
            </p>
          </div>
        )}

        {/* STEP 3: Comparison */}
        {step === 'comparison' && (
          <>
            <div className="bg-primary text-primary-foreground p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  <div>
                    <h2 className="text-2xl font-bold">AI Enhanced Version</h2>
                    <p className="text-sm opacity-90">Compare and choose</p>
                  </div>
                </div>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Subject Line */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary uppercase tracking-wide">
                  Generated Subject ✨
                </label>
                <div className="p-3 border-2 border-primary rounded-lg bg-primary/5 text-sm font-medium">
                  {polishedSubject}
                </div>
              </div>

              {/* Before */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                  Before (Original Dictation)
                </label>
                <div className="p-4 border border-border rounded-lg bg-muted/30 text-sm">
                  {dictatedText}
                </div>
              </div>

              {/* After */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary uppercase tracking-wide">
                  After (AI Enhanced) ✨
                </label>
                <div className="p-4 border-2 border-primary rounded-lg bg-primary/5 text-sm whitespace-pre-wrap">
                  {polishedText}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep('choice')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenRemix}
                  >
                    Open in Remix
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleUsePolished}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Insert Enhanced
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Clear saved dictation preference (for Settings page)
 */
export function clearDictationPreference() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get current dictation preference
 */
export function getDictationPreference(): DictationPreference {
  return (localStorage.getItem(STORAGE_KEY) as DictationPreference) || 'ask_every_time';
}

