/**
 * Equalizer Waveform Component
 *
 * Traditional bar-style audio visualizer that reacts to real-time audio levels
 * Perfect for showing microphone activity during recording/dictation
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface EqualizerWaveformProps {
  audioLevel: number; // 0-100
  isActive?: boolean;
  barCount?: number;
  className?: string;
  height?: number;
}

export function EqualizerWaveform({
  audioLevel,
  isActive = true,
  barCount = 40,
  className = '',
  height = 100
}: EqualizerWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barHeightsRef = useRef<number[]>(new Array(barCount).fill(0.1));
  const [primaryColor, setPrimaryColor] = useState<string>('99, 102, 241');

  // Get the primary color from CSS variables
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const primaryRgb = computedStyle.getPropertyValue('--primary-rgb').trim();

    if (primaryRgb) {
      setPrimaryColor(primaryRgb);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const canvasHeight = rect.height;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, canvasHeight);

      if (!isActive) {
        // Draw minimal bars when inactive
        const barWidth = (width / barCount) * 0.7;
        const gap = (width / barCount) * 0.3;

        for (let i = 0; i < barCount; i++) {
          const x = i * (barWidth + gap);
          const minHeight = 4;
          const y = canvasHeight - minHeight;

          ctx.fillStyle = `rgba(${primaryColor}, 0.2)`;
          ctx.fillRect(x, y, barWidth, minHeight);
        }
        return;
      }

      // Calculate bar width and gap
      const barWidth = (width / barCount) * 0.7;
      const gap = (width / barCount) * 0.3;

      // Simulate audio spectrum with audio level
      const normalizedLevel = audioLevel / 100;

      for (let i = 0; i < barCount; i++) {
        // Create frequency distribution - more energy in lower frequencies
        const frequencyBias = 1 - (i / barCount) * 0.5;

        // Add randomness for natural movement
        const randomFactor = 0.8 + Math.random() * 0.5;

        // Calculate target height with MORE aggressive response for higher bars
        const targetHeight = Math.pow(normalizedLevel * frequencyBias * randomFactor, 0.5); // Lower exponent = taller bars

        // MUCH faster interpolation for more responsive movement
        const currentHeight = barHeightsRef.current[i];
        const smoothed = currentHeight + (targetHeight - currentHeight) * 0.75; // Increased from 0.5 to 0.75
        barHeightsRef.current[i] = smoothed;

        // Ensure minimum visibility
        const minBarHeight = 6; // Increased from 4
        const barHeight = Math.max(minBarHeight, smoothed * canvasHeight * 1.2); // Increased from 0.9 to 1.2 for taller bars

        const x = i * (barWidth + gap);
        const y = canvasHeight - barHeight;

        // Color intensity based on height
        const intensity = smoothed;
        const opacity = 0.4 + (intensity * 0.6);

        // Use enhanced gradient for bars with multiple stops
        const gradient = ctx.createLinearGradient(0, y, 0, canvasHeight);
        gradient.addColorStop(0, `rgba(${primaryColor}, ${Math.min(1, opacity + 0.25)})`);
        gradient.addColorStop(0.3, `rgba(${primaryColor}, ${opacity})`);
        gradient.addColorStop(0.7, `rgba(${primaryColor}, ${opacity * 0.85})`);
        gradient.addColorStop(1, `rgba(${primaryColor}, ${opacity * 0.7})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Add glow effect for active bars
        if (intensity > 0.3) {
          ctx.shadowColor = `rgba(${primaryColor}, ${intensity * 0.5})`;
          ctx.shadowBlur = 10;
          ctx.fillRect(x, y, barWidth, barHeight);
          ctx.shadowBlur = 0;
          ctx.shadowColor = 'transparent';
        }

        // Add subtle highlight on top of taller bars
        if (intensity > 0.5 && barHeight > minBarHeight + 8) {
          const highlightHeight = Math.min(barHeight * 0.15, 6);
          const highlightGradient = ctx.createLinearGradient(0, y, 0, y + highlightHeight);
          highlightGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.15})`);
          highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = highlightGradient;
          ctx.fillRect(x, y, barWidth, highlightHeight);
        }
      }

      // Continue animation
      if (isActive) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive, barCount, primaryColor, height]);

  return (
    <div className={cn('relative w-full', className)} style={{ height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
