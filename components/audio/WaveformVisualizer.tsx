/**
 * WaveformVisualizer Component
 *
 * Organic blob-style waveform visualization
 * Features:
 * - Smooth organic blob animation
 * - Audio-reactive pulsating motion
 * - Theme-aware colors
 * - Inspired by modern audio visualizers
 */

'use client';

import { EqualizerWaveform } from './EqualizerWaveform';
import { cn } from '@/lib/utils';

interface WaveformVisualizerProps {
  audioLevel: number; // 0-100
  isActive: boolean;
  className?: string;
  barCount?: number;
}

export function WaveformVisualizer({
  audioLevel,
  isActive,
  className,
  barCount = 60,
}: WaveformVisualizerProps) {
  return (
    <div className={cn(
      'relative w-full h-20 rounded-lg overflow-hidden',
      'bg-gradient-to-b from-muted/30 via-muted/20 to-muted/30',
      'border border-border/50',
      'transition-all duration-300',
      isActive && 'ring-1 ring-primary/20 shadow-sm',
      className
    )}>
      <div className="absolute inset-0 p-1">
        <EqualizerWaveform
          audioLevel={audioLevel}
          isActive={isActive}
          barCount={barCount}
          height={72}
          className="w-full h-full"
        />
      </div>
      {/* Subtle center line when active */}
      {isActive && (
        <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

