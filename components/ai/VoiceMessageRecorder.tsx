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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!VoiceMessageRecorder.isSupported()) {
      setError('Voice recording is not supported in your browser');
    }
  }, []);

  const handleStart = async () => {
    try {
      setError(null);
      
      // Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Set up audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 64; // Smaller for better bar representation
      analyser.smoothingTimeConstant = 0.8;
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

  // Real-time audio-reactive waveform
  const startWaveformAnimation = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const bars = 32; // Number of equalizer bars

    const animate = () => {
      // Get real audio frequency data
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / bars;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#F97316'); // Orange
      gradient.addColorStop(0.5, '#EF4444'); // Red
      gradient.addColorStop(1, '#DC2626'); // Dark red

      // Draw bars based on actual audio levels
      for (let i = 0; i < bars; i++) {
        // Average multiple frequency bins for each bar
        const dataIndex = Math.floor((i / bars) * bufferLength);
        const value = dataArray[dataIndex] || 0;
        
        // Calculate height based on audio level (0-255)
        const height = (value / 255) * canvas.height * 0.9;
        const minHeight = 4; // Minimum bar height for visibility
        const barHeight = Math.max(height, minHeight);
        
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;

        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 3, barHeight);
      }

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

        <div className="p-6 space-y-6">
          {/* Waveform Visualization */}
          {status !== 'stopped' && (
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={500}
                height={100}
                className="w-full h-24 bg-gray-50 rounded-lg"
              />
              {status === 'ready' && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <Mic className="w-8 h-8" />
                </div>
              )}
            </div>
          )}

          {/* Audio Playback */}
          {status === 'stopped' && audioUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlayback}
                  className="flex-shrink-0"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full">
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
              <span className="text-gray-600">
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

