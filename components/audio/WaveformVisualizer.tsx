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
    <div className={cn('relative w-full h-20 rounded-lg overflow-hidden bg-card border border-border/50', className)}>
      <EqualizerWaveform
        audioLevel={audioLevel}
        isActive={isActive}
        barCount={barCount}
        height={80}
        className="w-full h-full"
      />
    </div>
  );
}

