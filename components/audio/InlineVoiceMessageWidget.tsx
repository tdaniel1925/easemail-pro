/**
 * InlineVoiceMessageWidget Component
 * 
 * Inline voice message recorder with waveform visualization
 * Features:
 * - No modal - appears inline in composer
 * - Real-time recording waveform
 * - Preview and re-record options
 * - Professional corporate design
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WaveformVisualizer } from '@/components/audio/WaveformVisualizer';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface InlineVoiceMessageWidgetProps {
  onAttach: (file: File, duration: number) => void;
  onCancel: () => void;
}

export function InlineVoiceMessageWidget({
  onAttach,
  onCancel,
}: InlineVoiceMessageWidgetProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setIsProcessing(false);
      };

      // Setup audio analysis for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Animate audio level
      const updateAudioLevel = () => {
        if (!analyzerRef.current) return;
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel((average / 255) * 100);
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    setIsProcessing(true);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  // Play/pause preview
  const togglePlayback = () => {
    if (!recordedBlob) return;

    if (!audioRef.current) {
      const url = URL.createObjectURL(recordedBlob);
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Attach voice message
  const handleAttach = () => {
    if (recordedBlob) {
      const file = new File([recordedBlob], `voice-message-${Date.now()}.webm`, {
        type: 'audio/webm',
      });
      onAttach(file, duration);
    }
  };

  // Re-record
  const handleRerecord = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setRecordedBlob(null);
    setDuration(0);
    setIsPlaying(false);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="my-4 p-5 border border-border rounded-xl bg-gradient-to-br from-card via-card to-muted/10 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
              isRecording ? "bg-red-500/10 ring-1 ring-red-500/20" : "bg-muted/50"
            )}>
              <Mic className={cn(
                "w-5 h-5 transition-colors duration-200",
                isRecording ? "text-red-500" : "text-muted-foreground"
              )} />
            </div>
            {isRecording && (
              <div className="absolute inset-0 w-10 h-10 rounded-full bg-red-500 animate-ping opacity-30" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {isProcessing ? 'Processing...' : isRecording ? `Recording... ${formatTime(duration)}` : recordedBlob ? `Recorded (${formatTime(duration)})` : 'Voice Message'}
            </span>
            {isRecording && (
              <span className="text-xs text-muted-foreground mt-1">
                Recording in progress
              </span>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Waveform Visualizer */}
      <div className="mb-4">
        <WaveformVisualizer
          audioLevel={recordedBlob ? (isPlaying ? 50 : 0) : audioLevel}
          isActive={isRecording || isPlaying}
          barCount={60}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {!recordedBlob ? (
          // Recording controls
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={cn(
              "gap-2 min-w-[220px] h-11 text-base font-semibold transition-all duration-200",
              isRecording && "shadow-md hover:shadow-lg",
              !isRecording && "shadow-sm hover:shadow-md"
            )}
          >
            {isProcessing ? (
              <>
                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : isRecording ? (
              <>
                <Square className="w-5 h-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Recording
              </>
            )}
          </Button>
        ) : (
          // Preview & attach controls
          <>
            <Button
              variant="outline"
              onClick={togglePlayback}
              className="gap-2 h-11 font-medium transition-colors"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Preview
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleRerecord}
              className="gap-2 h-11 font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Re-record
            </Button>
            <Button
              variant="default"
              onClick={handleAttach}
              className="gap-2 h-11 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <Check className="w-4 h-4" />
              Attach ({formatTime(duration)})
            </Button>
          </>
        )}
      </div>

      {/* Helper Text */}
      {!isRecording && !recordedBlob && !isProcessing && (
        <p className="text-xs text-center text-muted-foreground mt-4 font-medium">
          Record a voice message to attach to your email
        </p>
      )}
    </div>
  );
}

