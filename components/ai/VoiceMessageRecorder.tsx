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
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  const barsContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();
  const barElementsRef = useRef<HTMLDivElement[]>([]);
  const prevHeightsRef = useRef<number[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!VoiceMessageRecorder.isSupported()) {
      setError('Voice recording is not supported in your browser');
    }
  }, []);

  // Setup bars based on container size
  const setupBars = () => {
    const container = barsContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width || 0;
    const barWidth = 6;
    const gap = 6;
    const maxBars = 128;
    const count = Math.max(16, Math.min(maxBars, Math.floor((containerWidth + gap) / (barWidth + gap))));

    const current = barElementsRef.current.length;
    if (count === current) return;

    // Clear and rebuild bars
    container.innerHTML = '';
    barElementsRef.current = [];
    prevHeightsRef.current = [];

    for (let i = 0; i < count; i++) {
      const bar = document.createElement('div');
      bar.className = 'rounded-sm bg-gradient-to-t from-orange-500 to-red-500 transition-all duration-75 ease-out';
      bar.style.height = '8px';
      bar.style.minHeight = '4px';
      barElementsRef.current.push(bar);
      prevHeightsRef.current.push(8);
      container.appendChild(bar);
    }
  };

  // Initialize bars on mount and resize
  useEffect(() => {
    setupBars();
    
    const resizeObserver = new ResizeObserver(setupBars);
    if (barsContainerRef.current) {
      resizeObserver.observe(barsContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleStart = async () => {
    try {
      setError(null);
      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // Better for visualization
        },
      });

      // Set up audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.85;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start recorder
      recorderRef.current = new VoiceMessageRecorder({ maxDuration: 600 });
      await recorderRef.current.startRecording((dur, size) => {
        setDuration(dur);
        setFileSize(size);
      });

      setStatus('recording');
      startWaveformAnimation();
    } catch (error: any) {
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
    } catch (error: any) {
      setError(error.message || 'Failed to stop recording');
    }
  };

  const handlePause = () => {
    recorderRef.current?.pauseRecording();
    setStatus('paused');
  };

  const handleResume = () => {
    recorderRef.current?.resumeRecording();
    setStatus('recording');
  };

  const handleDiscard = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setStatus('ready');
    setDuration(0);
    setFileSize(0);
    recorderRef.current?.destroy();
  };

  const handleAttach = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      // Convert blob to File
      const file = new File([audioBlob], `voice-message-${Date.now()}.webm`, {
        type: audioBlob.type,
      });

      onAttach(file, duration);
      onClose();
      
      // Clean up
      handleDiscard();
    } catch (error: any) {
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
    setIsPlaying(!isPlaying);
  };

  // Real-time audio-reactive waveform with rectangular bars
  const startWaveformAnimation = () => {
    const analyser = analyserRef.current;
    const container = barsContainerRef.current;
    if (!analyser || !container) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const containerHeight = container.clientHeight;

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      
      const bars = barElementsRef.current;
      const nBars = bars.length;
      let sum = 0;

      for (let i = 0; i < nBars; i++) {
        // Logarithmic frequency mapping (like the example)
        const t = i / Math.max(1, nBars - 1);
        const bin = Math.min(
          bufferLength - 1,
          Math.floor((Math.pow(2, t) - 1) / (2 - 1) * (bufferLength - 1))
        );

        const v = dataArray[bin] / 255; // 0..1
        sum += v;

        // Target height with minimum for visibility
        const minPx = 6;
        const target = Math.max(minPx, Math.floor(v * containerHeight * 0.85));

        // Lerp (smooth interpolation) for fluid motion
        const prev = prevHeightsRef.current[i] ?? minPx;
        const lerped = prev + (target - prev) * 0.35;

        prevHeightsRef.current[i] = lerped;
        
        const bar = bars[i];
        if (bar) {
          bar.style.height = `${lerped}px`;
          // Dynamic opacity based on volume
          bar.style.opacity = `${0.4 + (v * 0.6)}`;
        }
      }

      // Update audio level indicator
      const avg = sum / Math.max(1, nBars);
      setAudioLevel(Math.min(100, Math.round(avg * 100)));

      if (status === 'recording') {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();
  };

  const stopWaveformAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    
    // Reset bars to idle state
    barElementsRef.current.forEach(bar => {
      bar.style.height = '8px';
      bar.style.opacity = '0.4';
    });
    setAudioLevel(0);
  };

  useEffect(() => {
    return () => {
      stopWaveformAnimation();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      recorderRef.current?.destroy();
    };
  }, [audioUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="w-6 h-6" />
            {status === 'stopped' ? 'Voice Message Ready' : 'Record Voice Message'}
          </h2>
          <p className="text-sm opacity-90">
            {status === 'stopped'
              ? 'Preview and attach your message'
              : 'Up to 10 minutes recording time'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Status & Audio Level */}
          {status !== 'stopped' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  status === 'recording' ? "bg-red-500 animate-pulse" : "bg-amber-500"
                )} />
                <span className="text-sm text-muted-foreground">
                  {status === 'recording' ? 'Recording...' : status === 'paused' ? 'Paused' : 'Ready'}
                </span>
              </div>
              {status === 'recording' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Level</span>
                  <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-[width] duration-150 ease-out"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Waveform Visualization */}
          {status !== 'stopped' && (
            <div className="h-32 md:h-40 rounded-lg border border-border bg-card p-2 overflow-hidden">
              <div 
                ref={barsContainerRef}
                className="h-full w-full grid items-end"
                style={{ gap: '6px' }}
              />
              {status === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <Mic className="w-8 h-8" />
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
                  <div className="h-2 bg-muted rounded-full">
                    <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full w-0" />
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

          {/* Duration & Size */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                ⏱ {formatDuration(duration)} / 10:00
              </span>
              <span className="text-muted-foreground">
                📎 {formatFileSize(fileSize)}
              </span>
            </div>
            {fileSize > 5 * 1024 * 1024 && (
              <span className="text-amber-600 text-xs">⚠️ Large file</span>
            )}
          </div>

          {/* Warning */}
          {duration >= 540 && duration < 600 && status === 'recording' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ Less than 1 minute remaining
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-3">
            {status === 'ready' && (
              <Button
                onClick={handleStart}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500"
                disabled={!!error}
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            )}

            {status === 'recording' && (
              <>
                <Button onClick={handlePause} variant="outline">
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={handleStop} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {status === 'paused' && (
              <>
                <Button onClick={handleResume} className="bg-orange-500">
                  <Mic className="w-4 h-4 mr-2" />
                  Resume
                </Button>
                <Button onClick={handleStop} variant="destructive">
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {status === 'stopped' && (
              <>
                <Button onClick={handleDiscard} variant="outline">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Discard
                </Button>
                <Button
                  onClick={handleAttach}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-orange-500 to-red-500"
                >
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

