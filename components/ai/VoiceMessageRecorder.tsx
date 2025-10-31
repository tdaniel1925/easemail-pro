/**
 * Voice Message Recorder Component
 * 
 * Record audio messages with waveform visualization
 * Up to 10 minutes, attach to emails
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  VoiceMessageRecorder,
  formatDuration,
  formatFileSize,
} from '@/lib/ai/voice-message-service';
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
  const [status, setStatus] = useState<'ready' | 'recording' | 'paused' | 'stopped'>('ready');
  const [duration, setDuration] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<VoiceMessageRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!VoiceMessageRecorder.isSupported()) {
      setError('Voice recording is not supported in your browser');
    }
  }, []);

  // Clean waveform animation using canvas
  const startWaveformAnimation = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) {
      console.log('❌ Missing canvas or analyser');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ No canvas context');
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    console.log('✅ Starting waveform animation, bufferLength:', bufferLength);

    // Get primary color from CSS
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--primary')
      .trim();

    const animate = () => {
      if (status !== 'recording') {
        console.log('Stopping animation, status:', status);
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      // Get actual canvas dimensions (accounting for device pixel ratio)
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Calculate bars
      const barCount = 60;
      const barWidth = width / barCount;
      const gap = 2;

      let sum = 0;
      let maxValue = 0;

      for (let i = 0; i < barCount; i++) {
        // Simple linear mapping for better debugging
        const bin = Math.floor((i / barCount) * bufferLength);
        const rawValue = dataArray[bin];
        maxValue = Math.max(maxValue, rawValue);
        
        const value = rawValue / 255;
        sum += value;

        // Calculate bar height with more sensitivity
        const minHeight = 4;
        const barHeight = Math.max(minHeight, value * height * 0.9);

        // Calculate opacity based on value
        const opacity = 0.4 + (value * 0.6);

        // Draw bar
        const x = i * barWidth;
        const y = height - barHeight;

        // Use a solid color that works in all themes
        ctx.fillStyle = `rgba(99, 102, 241, ${opacity})`; // Indigo color
        ctx.fillRect(x, y, barWidth - gap, barHeight);
      }

      // Update audio level
      const avg = sum / barCount;
      setAudioLevel(Math.min(100, Math.round(avg * 150)));

      // Debug log every 30 frames (~0.5 seconds)
      if (animationRef.current && animationRef.current % 30 === 0) {
        console.log('Audio data - max:', maxValue, 'avg:', (sum/barCount).toFixed(2), 'level:', Math.round(avg * 150));
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const stopWaveformAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setAudioLevel(0);
  };

  const handleStart = async () => {
    try {
      setError(null);
      
      console.log('🎤 Requesting microphone access...');
      
      // Get microphone stream with settings optimized for visualization
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Turn OFF for better visualization
          autoGainControl: true,
          sampleRate: 48000,
        },
      });

      console.log('✅ Microphone access granted');

      // Set up audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      // Optimize analyser settings for visualization
      analyser.fftSize = 1024; // Higher = more frequency resolution
      analyser.smoothingTimeConstant = 0.75; // Less smoothing = more responsive
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      console.log('✅ Audio context created, FFT size:', analyser.fftSize, 'Frequency bins:', analyser.frequencyBinCount);

      // Start recorder
      recorderRef.current = new VoiceMessageRecorder({ maxDuration: 600 });
      await recorderRef.current.startRecording((dur, size) => {
        setDuration(dur);
        setFileSize(size);
      });

      setStatus('recording');
      
      console.log('✅ Recording started, beginning waveform...');
      
      // Start waveform after a short delay
      setTimeout(() => {
        startWaveformAnimation();
      }, 100);
    } catch (error: any) {
      console.error('❌ Recording start error:', error);
      setError(error.message || 'Failed to start recording');
      setStatus('ready');
    }
  };

  const handleStop = async () => {
    if (!recorderRef.current) return;

    try {
      const blob = await recorderRef.current.stopRecording();
      setAudioBlob(blob);
      setAudioUrl(URL.createObjectURL(blob));
      setStatus('stopped');
      stopWaveformAnimation();

      // Clean up audio context
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (error: any) {
      console.error('Recording stop error:', error);
      setError(error.message || 'Failed to stop recording');
    }
  };

  const handlePause = () => {
    recorderRef.current?.pauseRecording();
    setStatus('paused');
    stopWaveformAnimation();
  };

  const handleResume = () => {
    recorderRef.current?.resumeRecording();
    setStatus('recording');
    startWaveformAnimation();
  };

  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    stopWaveformAnimation();
    setAudioBlob(null);
    setAudioUrl(null);
    setStatus('ready');
    setDuration(0);
    setFileSize(0);
    recorderRef.current?.destroy();

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const handleAttach = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      // Convert blob to File
      const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
        type: 'audio/webm',
      });

      onAttach(file, duration);
      onClose();

      // Reset state
      handleDiscard();
    } catch (error: any) {
      console.error('Attachment error:', error);
      setError(error.message || 'Failed to attach voice message');
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Update canvas size on mount and resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      
      // Set actual size (with device pixel ratio for crisp rendering)
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;

      console.log('Canvas sized:', rect.width, 'x', rect.height, 'DPR:', window.devicePixelRatio);

      // DON'T scale the context - we'll handle DPR in the animate function
    };

    if (isOpen) {
      // Multiple attempts to ensure canvas is sized
      setTimeout(updateCanvasSize, 50);
      setTimeout(updateCanvasSize, 150);
      setTimeout(updateCanvasSize, 300);
    }

    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      stopWaveformAnimation();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      recorderRef.current?.destroy();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        {/* Header */}
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
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Status & Audio Level */}
          {status !== 'stopped' && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  status === 'recording' ? "bg-red-500 animate-pulse" : 
                  status === 'paused' ? "bg-amber-500" : "bg-muted-foreground"
                )} />
                <span className="text-sm font-medium">
                  {status === 'recording' ? 'Recording...' : 
                   status === 'paused' ? 'Paused' : 'Ready'}
                </span>
              </div>
              {status === 'recording' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Level</span>
                  <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-[width] duration-150 ease-out"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Waveform Visualization */}
          {status !== 'stopped' && (
            <div className="relative h-32 md:h-40 rounded-lg border bg-card overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ width: '100%', height: '100%' }}
              />
              {status === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <Mic className="w-12 h-12 opacity-30" />
                </div>
              )}
            </div>
          )}

          {/* Audio Playback */}
          {status === 'stopped' && audioUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayback}
                  className="flex-shrink-0"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <div className="flex-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-0" />
                  </div>
                </div>
                <span className="text-sm font-medium">{formatDuration(duration)}</span>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-mono font-medium">{formatDuration(duration)}</span>
            </div>
            {fileSize > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-mono font-medium">{formatFileSize(fileSize)}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-2 pt-2">
            {status === 'ready' && (
              <>
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleStart} disabled={!!error}>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              </>
            )}

            {status === 'recording' && (
              <>
                <Button variant="outline" onClick={handlePause}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={handleStop}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {status === 'paused' && (
              <>
                <Button variant="outline" onClick={handleStop}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
                <Button onClick={handleResume}>
                  <Mic className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              </>
            )}

            {status === 'stopped' && (
              <>
                <Button variant="outline" onClick={handleDiscard}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard
                </Button>
                <Button onClick={handleAttach} disabled={isUploading || !audioBlob}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Attaching...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Attach to Email
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
