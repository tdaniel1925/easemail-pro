'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface TrainAIButtonProps {
  accountId: string | null;
  compact?: boolean;
}

interface StyleProfile {
  hasStyle: boolean;
  styleProfile: string | null;
  learnedAt: string | null;
  usePersonalStyle: boolean;
}

export function TrainAIButton({ accountId, compact = false }: TrainAIButtonProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current style profile on mount
  useEffect(() => {
    const fetchStyleProfile = async () => {
      try {
        const response = await fetch('/api/ai/learn-style');
        if (response.ok) {
          const data = await response.json();
          setStyleProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch style profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStyleProfile();
  }, []);

  const handleTrain = async () => {
    if (!accountId) {
      toast({
        title: 'No Account Selected',
        description: 'Please select an email account first.',
        variant: 'destructive',
      });
      return;
    }

    setIsTraining(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/learn-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (data.success) {
        setStyleProfile({
          hasStyle: true,
          styleProfile: data.styleProfile,
          learnedAt: new Date().toISOString(),
          usePersonalStyle: true,
        });
        toast({
          title: 'AI Trained Successfully',
          description: `Analyzed ${data.emailsAnalyzed} sent emails to learn your writing style.`,
        });
      } else {
        setError(data.error || 'Failed to train AI');
        toast({
          title: 'Training Failed',
          description: data.details || data.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Training error:', err);
      setError('Failed to connect to the server');
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to the server. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTraining(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size={compact ? 'sm' : 'icon'}
        onClick={() => setIsOpen(true)}
        title="Train AI on your writing style"
        className={cn(
          compact ? 'h-6 w-6 p-0 flex-shrink-0' : 'h-9 w-9',
          'relative',
          styleProfile?.hasStyle && 'text-primary'
        )}
      >
        <Sparkles className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
        {styleProfile?.hasStyle && (
          <span className={cn(
            'absolute rounded-full bg-green-500',
            compact ? '-top-0.5 -right-0.5 h-1.5 w-1.5' : '-top-0.5 -right-0.5 h-2 w-2'
          )} />
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        // Clear error when dialog opens
        if (open) setError(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Train AI on Your Writing Style
            </DialogTitle>
            <DialogDescription>
              AI will analyze your last 50 sent emails to learn your unique writing style,
              making generated emails sound more natural and like you.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Status */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Training Status</span>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : styleProfile?.hasStyle ? (
                  <span className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    Trained
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not trained</span>
                )}
              </div>

              {styleProfile?.learnedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last trained</span>
                  <span>{formatDate(styleProfile.learnedAt)}</span>
                </div>
              )}
            </div>

            {/* Style Preview */}
            {styleProfile?.styleProfile && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Your Writing Style Profile</h4>
                <div className="p-3 rounded-lg bg-muted/30 border text-sm max-h-48 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {styleProfile.styleProfile}
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* What AI Learns */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">What AI will learn:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                <li className="list-disc">Your typical greetings and sign-offs</li>
                <li className="list-disc">Tone and formality level</li>
                <li className="list-disc">Common phrases you use</li>
                <li className="list-disc">Sentence structure preferences</li>
                <li className="list-disc">Punctuation style (emojis, exclamations)</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleTrain}
              disabled={isTraining || !accountId}
              className="gap-2"
            >
              {isTraining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Training...
                </>
              ) : styleProfile?.hasStyle ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Retrain
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Train AI
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
