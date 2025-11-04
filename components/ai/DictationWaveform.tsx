/**
 * Dictation Waveform Visualizer
 *
 * Real-time audio waveform display for dictation
 * Shows under the compose text area while dictating
 */

'use client';

import { useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dataArrayRef = useRef<number[]>(Array(50).fill(0));

  // Animate waveform
  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = width / 50;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Update data array (shift left and add new value)
      dataArrayRef.current.shift();
      dataArrayRef.current.push(audioLevel);

      // Draw bars
      dataArrayRef.current.forEach((value, index) => {
        const barHeight = (value / 100) * height * 0.8; // Max 80% of height
        const x = index * barWidth;
        const y = (height - barHeight) / 2;

        // Gradient color based on audio level
        const hue = Math.min(value * 1.2, 120); // Green (120) to red (0)
        ctx.fillStyle = `hsl(${120 - hue}, 70%, 50%)`;

        // Draw rounded bar
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barWidth - 2, barHeight, 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioLevel]);

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

        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={60}
          className="w-full h-[60px] rounded-lg bg-black/5"
        />

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
