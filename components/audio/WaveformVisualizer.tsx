/**
 * WaveformVisualizer Component
 * 
 * Professional audio waveform visualization that adapts to theme
 * Features:
 * - Theme-aware colors (uses CSS variables)
 * - Smooth animation with wave motion
 * - Real-time audio level response
 * - Corporate/futuristic aesthetic
 */

'use client';

import { useEffect, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get theme colors from CSS variables
    const getThemeColor = (variable: string): string => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(variable)
        .trim();
      return value;
    };

    // Parse HSL color value
    const parseHSL = (hslString: string): { h: number; s: number; l: number } => {
      const values = hslString.split(' ').map(v => parseFloat(v));
      return {
        h: values[0] || 210,
        s: values[1] || 100,
        l: values[2] || 50,
      };
    };

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Initialize bars with random heights
    if (barsRef.current.length === 0) {
      barsRef.current = Array.from({ length: barCount }, () => Math.random());
    }

    const animate = () => {
      const { width, height } = rect;
      
      // Clear canvas with theme background
      const bgHSL = getThemeColor('--background');
      const bg = parseHSL(bgHSL);
      ctx.fillStyle = `hsl(${bg.h}, ${bg.s}%, ${Math.max(bg.l - 5, 0)}%)`;
      ctx.fillRect(0, 0, width, height);

      const barWidth = width / barCount;
      const gap = barWidth * 0.3;
      const actualBarWidth = barWidth - gap;
      const centerY = height / 2;

      // Update bars with smooth animation and wave motion
      barsRef.current = barsRef.current.map((bar, i) => {
        // Create sine wave motion across bars
        const waveOffset = Math.sin((i / barCount) * Math.PI * 2 + Date.now() / 1000) * 0.3;
        const targetHeight = isActive 
          ? (audioLevel / 100) * 0.7 + Math.random() * 0.3 + waveOffset
          : 0.1 + Math.random() * 0.1 + waveOffset * 0.2;
        
        // Smooth interpolation
        return bar + (targetHeight - bar) * 0.15;
      });

      // Get theme primary color for gradient
      const primaryHSL = getThemeColor('--primary');
      const primary = parseHSL(primaryHSL);

      // Draw each bar with theme-based gradient
      barsRef.current.forEach((barHeight, i) => {
        const x = i * barWidth + gap / 2;
        const maxHeight = height * 0.85;
        const h = Math.max(2, barHeight * maxHeight);

        // Create vertical gradient: lighter at top, darker at bottom
        const gradient = ctx.createLinearGradient(0, centerY - h/2, 0, centerY + h/2);
        
        // Use theme primary color with varying lightness
        gradient.addColorStop(0, `hsl(${primary.h}, ${primary.s}%, ${Math.min(primary.l + 20, 80)}%)`);
        gradient.addColorStop(0.3, `hsl(${primary.h}, ${primary.s}%, ${primary.l}%)`);
        gradient.addColorStop(0.7, `hsl(${primary.h}, ${Math.max(primary.s - 10, 50)}%, ${Math.max(primary.l - 10, 40)}%)`);
        gradient.addColorStop(1, `hsl(${primary.h}, ${Math.max(primary.s - 20, 40)}%, ${Math.max(primary.l - 20, 30)}%)`);

        ctx.fillStyle = gradient;
        
        // Draw symmetrical bar from center (like audio waveform)
        const barTop = centerY - h / 2;
        
        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(x, barTop, actualBarWidth, h, actualBarWidth / 2);
        ctx.fill();

        // Add subtle glow effect for taller bars when active
        if (isActive && barHeight > 0.5) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = `hsl(${primary.h}, ${primary.s}%, ${primary.l}%)`;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Continue animation if active
      if (isActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive, barCount]);

  return (
    <div className={cn('relative w-full h-20 rounded-lg overflow-hidden bg-card border border-border/50', className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      {/* Subtle gradient overlay using theme */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/5" />
      </div>
    </div>
  );
}

