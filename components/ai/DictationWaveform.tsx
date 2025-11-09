/**
 * Dictation Waveform Visualizer
 *
 * Real-time audio waveform display for dictation with organic blob animation
 * Shows under the compose text area while dictating
 */

'use client';

import { MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EqualizerWaveform } from '@/components/audio/EqualizerWaveform';

interface DictationWaveformProps {
  isActive: boolean;
  audioLevel?: number;
  onStop: () => void;
  interimText?: string;
  className?: string;
}

export function DictationWaveform({
  isActive,
  audioLevel = 0,
  onStop,
  interimText,
  className,
}: DictationWaveformProps) {
  if (!isActive) return null;

  return (
    <div className={cn(
      'border-t border-border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 animate-in fade-in slide-in-from-bottom-2',
      className
    )}>
      <div className="max-w-4xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-sm font-medium text-foreground">
              Listening...
            </span>
            <span className="text-xs text-muted-foreground">
              Speak clearly into your microphone
            </span>
          </div>

          {/* Stop Button */}
          <Button
            onClick={onStop}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <MicOff className="w-4 h-4" />
            Stop
          </Button>
        </div>

        {/* Equalizer Waveform */}
        <div className="w-full rounded-lg bg-black/5 overflow-hidden">
          <EqualizerWaveform
            audioLevel={audioLevel}
            isActive={isActive}
            barCount={50}
            height={80}
          />
        </div>

        {/* Interim Text Preview */}
        {interimText && (
          <div className="text-sm text-muted-foreground italic bg-muted/50 rounded-lg p-3 border border-border">
            <span className="text-xs font-semibold uppercase tracking-wide mr-2 text-primary">
              Preview:
            </span>
            "{interimText}..."
          </div>
        )}

        {/* Tips */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Speak naturally
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Pause between sentences
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Text appears continuously
          </div>
        </div>
      </div>
    </div>
  );
}
