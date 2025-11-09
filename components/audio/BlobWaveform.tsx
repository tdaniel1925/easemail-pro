'use client';

import { useEffect, useRef, useState } from 'react';

interface BlobWaveformProps {
  audioLevel: number; // 0-100
  isActive?: boolean;
  size?: number;
  className?: string;
}

export function BlobWaveform({
  audioLevel,
  isActive = true,
  size = 200,
  className = ''
}: BlobWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);
  const [primaryColor, setPrimaryColor] = useState<string>('59, 130, 246');

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
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.3;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size);

      if (!isActive) {
        // Draw simple circle when inactive
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${primaryColor}, 0.1)`;
        ctx.fill();
        return;
      }

      // Increment time for animation
      timeRef.current += 0.02;

      // Calculate dynamic radius based on audio level
      const levelScale = 1 + (audioLevel / 100) * 0.5; // Scale 1.0 to 1.5
      const radius = baseRadius * levelScale;

      // Create blob path with multiple control points
      const points = 8; // Number of points for the blob
      const angleStep = (Math.PI * 2) / points;

      ctx.beginPath();

      for (let i = 0; i <= points; i++) {
        const angle = i * angleStep;

        // Create organic movement with multiple sine waves
        const wave1 = Math.sin(timeRef.current + angle * 2) * 0.1;
        const wave2 = Math.sin(timeRef.current * 1.5 - angle) * 0.05;
        const wave3 = Math.sin(timeRef.current * 0.5 + angle * 3) * 0.03;

        // Audio-reactive component
        const audioWave = (audioLevel / 100) * Math.sin(timeRef.current * 3 + angle * 4) * 0.15;

        const variation = wave1 + wave2 + wave3 + audioWave;
        const currentRadius = radius * (1 + variation);

        const x = centerX + Math.cos(angle) * currentRadius;
        const y = centerY + Math.sin(angle) * currentRadius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Create smooth curves between points
          const prevAngle = (i - 1) * angleStep;
          const prevWave1 = Math.sin(timeRef.current + prevAngle * 2) * 0.1;
          const prevWave2 = Math.sin(timeRef.current * 1.5 - prevAngle) * 0.05;
          const prevWave3 = Math.sin(timeRef.current * 0.5 + prevAngle * 3) * 0.03;
          const prevAudioWave = (audioLevel / 100) * Math.sin(timeRef.current * 3 + prevAngle * 4) * 0.15;
          const prevVariation = prevWave1 + prevWave2 + prevWave3 + prevAudioWave;
          const prevRadius = radius * (1 + prevVariation);

          const prevX = centerX + Math.cos(prevAngle) * prevRadius;
          const prevY = centerY + Math.sin(prevAngle) * prevRadius;

          // Control points for smooth curve
          const cpAngle = prevAngle + angleStep / 2;
          const cpRadius = (prevRadius + currentRadius) / 2;
          const cpX = centerX + Math.cos(cpAngle) * cpRadius;
          const cpY = centerY + Math.sin(cpAngle) * cpRadius;

          ctx.quadraticCurveTo(cpX, cpY, x, y);
        }
      }

      ctx.closePath();

      // Create gradient fill
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );

      // Dynamic colors based on audio level
      const alpha = 0.2 + (audioLevel / 100) * 0.3;
      gradient.addColorStop(0, `rgba(${primaryColor}, ${alpha + 0.2})`);
      gradient.addColorStop(0.5, `rgba(${primaryColor}, ${alpha})`);
      gradient.addColorStop(1, `rgba(${primaryColor}, 0.05)`);

      ctx.fillStyle = gradient;
      ctx.fill();

      // Add outer glow
      ctx.strokeStyle = `rgba(${primaryColor}, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Continue animation
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive, size, primaryColor]);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
}
