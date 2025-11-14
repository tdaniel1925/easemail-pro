/**
 * DictateButton Component
 * 
 * Real-time speech-to-text dictation for email composition
 * Features:
 * - Instant transcription with Web Speech API
 * - Visual feedback while speaking
 * - Premium Whisper enhancement
 * - Usage tracking
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DictationService,
  SmartPunctuationProcessor,
  DictationUsageTracker
} from '@/lib/ai/dictation-service';
import { cn } from '@/lib/utils';

interface DictateButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onDictationComplete?: (fullText: string) => void; // ✅ NEW: Called when dictation session ends
  onListeningChange?: (isListening: boolean) => void; // ✅ NEW: Notify parent of state changes
  onAudioLevelChange?: (level: number) => void; // ✅ NEW: Pass audio level to parent
  onInterimTextChange?: (text: string) => void; // ✅ NEW: Pass interim text to parent
  disabled?: boolean;
  className?: string;
  userTier?: 'free' | 'pro' | 'business';
}

export function DictateButton({
  onTranscript,
  onDictationComplete,
  onListeningChange,
  onAudioLevelChange,
  onInterimTextChange,
  disabled = false,
  className,
  userTier = 'free',
}: DictateButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [showEnhancement, setShowEnhancement] = useState(false);

  const dictationRef = useRef<DictationService | null>(null);
  const punctuationRef = useRef(new SmartPunctuationProcessor());
  const usageTrackerRef = useRef(new DictationUsageTracker());
  const audioRecordingRef = useRef<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null); // ✅ Track MediaRecorder
  const streamRef = useRef<MediaStream | null>(null); // ✅ Track stream for cleanup
  const fullTranscriptRef = useRef<string>(''); // ✅ Track complete transcript

  // Initialize dictation service
  useEffect(() => {
    dictationRef.current = new DictationService({
      language: 'en-US',
      continuous: true,
      interimResults: true,
    });

    const support = dictationRef.current.getBrowserSupport();
    setIsSupported(support.isSupported);

    if (!support.isSupported) {
      setError(`Real-time dictation not supported. ${support.recommendation}`);
    }

    return () => {
      dictationRef.current?.destroy();
    };
  }, []);

  // Start dictation
  const handleStart = async () => {
    if (!dictationRef.current || !isSupported) {
      return;
    }

    setError(null);
    setInterimText('');
    fullTranscriptRef.current = ''; // ✅ Reset transcript
    usageTrackerRef.current.startTracking();

    // ✅ FIX: startDictation already requests microphone permission
    // We'll start audio recording AFTER permission is granted (in onStart callback)

    await dictationRef.current.startDictation({
      onStart: () => {
        setIsListening(true);
        onListeningChange?.(true); // ✅ Notify parent
        console.log('🎤 Dictation started');

        // ✅ FIX: Start recording AFTER permission granted (for premium users)
        if (userTier !== 'free') {
          startAudioRecording();
        }
      },

      onResult: (result) => {
        // Process with smart punctuation
        const processed = punctuationRef.current.process(
          result.text,
          result.isFinal
        );

        if (result.isFinal) {
          // Final text - add to full transcript (for dialog)
          fullTranscriptRef.current += processed + ' ';
          // Still send to parent for real-time display (they handle it)
          onTranscript(processed + ' ', true);
          setInterimText('');
          onInterimTextChange?.(''); // ✅ Clear interim for parent
        } else {
          // Interim text - show as preview
          setInterimText(processed);
          onTranscript(processed, false);
          onInterimTextChange?.(processed); // ✅ Send interim to parent for waveform
        }
      },

      onEnd: () => {
        setIsListening(false);
        onListeningChange?.(false); // ✅ Notify parent
        const minutes = usageTrackerRef.current.stopTracking();
        console.log(`🎤 Dictation ended. Used ${minutes} minutes.`);

        // Stop audio recording
        if (userTier !== 'free') {
          stopAudioRecording();
        }

        // ✅ Trigger dialog with complete transcript
        if (onDictationComplete && fullTranscriptRef.current.trim().length > 0) {
          onDictationComplete(fullTranscriptRef.current.trim());
        }
      },

      onError: (errorType) => {
        setIsListening(false);
        onListeningChange?.(false); // ✅ Notify parent
        handleDictationError(errorType);
      },

      onAudioLevel: (level) => {
        setAudioLevel(level);
        onAudioLevelChange?.(level); // ✅ Send to parent for waveform
      },
    });
  };

  // Stop dictation
  const handleStop = () => {
    if (dictationRef.current) {
      dictationRef.current.stopDictation();
      setIsListening(false);
      setInterimText('');
    }
  };

  // Toggle dictation
  const handleToggle = () => {
    if (isListening) {
      handleStop();
    } else {
      handleStart();
    }
  };

  // Handle errors
  const handleDictationError = (errorType: string) => {
    const errorMessages = {
      'not-supported': 'Your browser doesn\'t support real-time dictation. Try Chrome, Edge, or Safari.',
      'permission-denied': 'Microphone permission denied. Please allow microphone access.',
      'no-speech': 'No speech detected. Please speak clearly into your microphone.',
      'network-error': 'Network error. Please check your connection.',
      'aborted': 'Dictation was interrupted.',
    };

    setError(errorMessages[errorType as keyof typeof errorMessages] || 'An error occurred');
  };

  // Audio recording for Whisper enhancement
  const startAudioRecording = async () => {
    try {
      // ✅ FIX: Reuse the same stream that Web Speech API is using
      // Get the existing media stream instead of requesting a new one
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; // ✅ Store stream reference

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder; // ✅ Store recorder reference
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        audioRecordingRef.current = new Blob(chunks, { type: 'audio/webm' });
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      // Don't fail the whole dictation if recording fails
    }
  };

  const stopAudioRecording = () => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // ✅ Stop all media tracks to release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Recording stops automatically via MediaRecorder.onstop
    if (audioRecordingRef.current && userTier !== 'free') {
      setShowEnhancement(true);
    }
  };

  // Enhance with Whisper (premium feature)
  const handleEnhancement = async () => {
    if (!audioRecordingRef.current) return;

    try {
      const formData = new FormData();
      formData.append('file', audioRecordingRef.current);
      formData.append('purpose', 'enhancement');

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Enhancement failed');
      }

      const data = await response.json();
      
      // TODO: Show diff between original and enhanced
      // TODO: Allow user to accept enhanced version
      console.log('Enhanced transcription:', data);
      
    } catch (error) {
      console.error('Enhancement error:', error);
    }
  };

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      {/* Main Dictate Button */}
      <Button
        onClick={handleToggle}
        disabled={disabled || !isSupported}
        variant={isListening ? 'destructive' : 'ghost'}
        size="sm"
        className={cn(
          'relative transition-all',
          isListening && 'animate-pulse'
        )}
        title={isListening ? 'Stop dictation (Ctrl+D)' : 'Start dictation (Ctrl+D)'}
      >
        {isListening ? (
          <>
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <MicOff className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Stop</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Dictate</span>
          </>
        )}
      </Button>

      {/* Audio Level Indicator */}
      {isListening && (
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1 h-3 rounded-full bg-gray-300 transition-all',
                audioLevel > (i + 1) * 20 && 'bg-green-500 h-4'
              )}
            />
          ))}
        </div>
      )}

      {/* Enhancement Button (Premium) */}
      {showEnhancement && userTier !== 'free' && (
        <Button
          onClick={handleEnhancement}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          <Sparkles className="w-3 h-3 mr-1" />
          Enhance
        </Button>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Interim text is now shown directly in the compose body */}
    </div>
  );
}

/**
 * Inline Dictation Widget
 * Shows in the composer with real-time feedback
 */
export function DictationWidget({
  isActive,
  interimText,
  onStop,
}: {
  isActive: boolean;
  interimText: string;
  onStop: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isActiveRef = useRef(false);

  // Setup audio visualization
  useEffect(() => {
    if (!isActive) {
      isActiveRef.current = false;
      return;
    }

    isActiveRef.current = true;

    const setupAudioVisualization = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: true,
          }
        });

        streamRef.current = stream;

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        animateWaveform();
      } catch (error) {
        console.error('Failed to setup audio visualization:', error);
      }
    };

    setupAudioVisualization();

    return () => {
      isActiveRef.current = false;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isActive]);

  // Animate waveform
  const animateWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;

    if (!canvas || !analyser || !isActiveRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const barCount = 20;
    const barWidth = (width / barCount) * 0.7;
    const gap = (width / barCount) * 0.3;

    for (let i = 0; i < barCount; i++) {
      const percent = i / (barCount - 1);
      const index = Math.floor(Math.pow(percent, 0.5) * bufferLength);
      const value = dataArray[index] / 255;

      const minBarHeight = 4;
      const barHeight = Math.max(minBarHeight, value * height * 0.9);
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      const opacity = 0.4 + (value * 0.6);
      ctx.fillStyle = `rgba(59, 130, 246, ${opacity})`;
      ctx.fillRect(x, y, barWidth, barHeight);
    }

    if (isActiveRef.current) {
      animationRef.current = requestAnimationFrame(animateWaveform);
    }
  }, []);

  // Update canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    setTimeout(updateSize, 100);
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-80 animate-in slide-in-from-bottom">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-medium text-sm">Listening...</span>
        </div>
        <Button onClick={onStop} size="sm" variant="ghost">
          <MicOff className="w-4 h-4" />
        </Button>
      </div>

      {/* Real-time Audio Waveform Visualization */}
      <div className="relative h-12 mb-3 rounded-lg border bg-card overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>

      {/* Interim Text */}
      {interimText && (
        <div className="text-sm text-gray-600 dark:text-gray-300 italic border-t border-gray-100 dark:border-gray-700 pt-3">
          "{interimText}..."
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Speak clearly into your microphone
      </p>
    </div>
  );
}

/**
 * Usage Monitor
 * Shows remaining dictation time for free users
 */
export function DictationUsageMonitor({
  tier,
  usedMinutes,
  limitMinutes,
}: {
  tier: 'free' | 'pro' | 'business';
  usedMinutes: number;
  limitMinutes: number;
}) {
  if (tier === 'business') {
    return null; // Unlimited
  }

  const remaining = Math.max(0, limitMinutes - usedMinutes);
  const percentage = (remaining / limitMinutes) * 100;

  return (
    <div className="text-xs text-gray-600 flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all',
            percentage > 20 ? 'bg-green-500' : 'bg-red-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span>
        {remaining} min left
        {tier === 'free' && remaining <= 5 && (
          <a href="/pricing" className="ml-1 text-blue-600 underline">
            Upgrade
          </a>
        )}
      </span>
    </div>
  );
}

