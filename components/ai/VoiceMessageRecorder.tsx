/**
 * Voice Message Recorder Component - SIMPLIFIED VERSION
 * 
 * Record audio messages with working waveform visualization
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface VoiceMessageRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (file: File, duration: number) => void;
}

export function VoiceMessageRecorderModal({
  isOpen,
  onClose,
  onAttach,
}: VoiceMessageRecorderProps) {
  const [status, setStatus] = useState<'ready' | 'recording' | 'stopped'>('ready');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout>();
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if recording is supported
  const isSupported = typeof window !== 'undefined' && 
                      typeof navigator !== 'undefined' && 
                      navigator.mediaDevices && 
                      typeof MediaRecorder !== 'undefined';

  // Start recording
  const handleStart = async () => {
    try {
      setError(null);
      console.log('🎤 Starting recording...');

      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Better for visualization
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Set up audio analysis for waveform
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Start timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);
        
        // Auto-stop at 10 minutes
        if (elapsed >= 600) {
          handleStop();
        }
      }, 100);

      setStatus('recording');
      console.log('✅ Recording started');
      
      // Start waveform animation
      requestAnimationFrame(() => animateWaveform());

    } catch (error: any) {
      console.error('❌ Recording error:', error);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  // Waveform animation
  const animateWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    
    if (!canvas || !analyser || status !== 'recording') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);

    // Get canvas dimensions
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw bars
    const barCount = 40;
    const barWidth = (width / barCount) * 0.8;
    const gap = (width / barCount) * 0.2;

    let sum = 0;

    for (let i = 0; i < barCount; i++) {
      const index = Math.floor((i / barCount) * bufferLength);
      const value = dataArray[index] / 255;
      sum += value;

      const barHeight = Math.max(4, value * height * 0.8);
      const x = i * (barWidth + gap);
      const y = height - barHeight;

      // Draw bar with theme color
      ctx.fillStyle = `rgba(99, 102, 241, ${0.4 + value * 0.6})`;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    // Update audio level
    const avgLevel = (sum / barCount) * 100;
    setAudioLevel(Math.min(100, Math.round(avgLevel * 1.5)));

    // Continue animation
    if (status === 'recording') {
      animationRef.current = requestAnimationFrame(animateWaveform);
    }
  };

  // Stop recording
  const handleStop = async () => {
    console.log('⏹️ Stopping recording...');

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();

      // Wait for final data
      await new Promise(resolve => {
        mediaRecorderRef.current!.onstop = resolve;
      });
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }

    // Create audio blob
    const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setStatus('stopped');
    setAudioLevel(0);

    console.log('✅ Recording stopped, size:', blob.size);
  };

  // Discard recording
  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setStatus('ready');
    setDuration(0);
    setAudioLevel(0);
  };

  // Attach to email
  const handleAttach = () => {
    if (!audioUrl) return;

    fetch(audioUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `voice-message-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        onAttach(file, duration);
        onClose();
        handleDiscard();
      });
  };

  // Toggle playback
  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Setup canvas on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      console.log('📐 Canvas sized:', rect.width, 'x', rect.height);
    };

    setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  if (!isSupported) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            {status === 'stopped' ? 'Voice Message Ready' : 'Record Voice Message'}
          </DialogTitle>
          <DialogDescription>
            {status === 'stopped'
              ? 'Preview and attach your message'
              : 'Up to 10 minutes recording time'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Status Bar */}
          {status !== 'stopped' && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  status === 'recording' ? "bg-red-500 animate-pulse" : "bg-muted-foreground"
                )} />
                <span className="text-sm font-medium">
                  {status === 'recording' ? 'Recording...' : 'Ready'}
                </span>
              </div>
              {status === 'recording' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Level</span>
                  <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-[width] duration-150"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Waveform */}
          {status !== 'stopped' && (
            <div className="relative h-32 rounded-lg border bg-card overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
              />
              {status === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <Mic className="w-12 h-12 opacity-30" />
                </div>
              )}
            </div>
          )}

          {/* Playback */}
          {status === 'stopped' && audioUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayback}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-sm font-medium">{formatDuration(duration)}</span>
                </div>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>
          )}

          {/* Duration Display */}
          <div className="text-center">
            <span className="text-2xl font-mono font-bold">{formatDuration(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex gap-2 pt-2">
            {status === 'ready' && (
              <>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleStart} disabled={!!error} className="flex-1">
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              </>
            )}

            {status === 'recording' && (
              <Button onClick={handleStop} className="w-full">
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            )}

            {status === 'stopped' && (
              <>
                <Button variant="outline" onClick={handleDiscard} className="flex-1">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard
                </Button>
                <Button onClick={handleAttach} className="flex-1">
                  <Check className="w-4 h-4 mr-2" />
                  Attach to Email
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
