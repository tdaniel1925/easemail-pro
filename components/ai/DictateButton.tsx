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

import { useState, useEffect, useRef } from 'react';
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
  disabled?: boolean;
  className?: string;
  userTier?: 'free' | 'pro' | 'business';
}

export function DictateButton({
  onTranscript,
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
    usageTrackerRef.current.startTracking();

    // Start recording for Whisper enhancement (if premium)
    if (userTier !== 'free') {
      startAudioRecording();
    }

    await dictationRef.current.startDictation({
      onStart: () => {
        setIsListening(true);
        console.log('🎤 Dictation started');
      },

      onResult: (result) => {
        // Process with smart punctuation
        const processed = punctuationRef.current.process(
          result.text,
          result.isFinal
        );

        if (result.isFinal) {
          // Final text - insert into editor
          onTranscript(processed + ' ', true);
          setInterimText('');
        } else {
          // Interim text - show as preview
          setInterimText(processed);
          onTranscript(processed, false);
        }
      },

      onEnd: () => {
        setIsListening(false);
        const minutes = usageTrackerRef.current.stopTracking();
        console.log(`🎤 Dictation ended. Used ${minutes} minutes.`);

        // Stop audio recording
        if (userTier !== 'free') {
          stopAudioRecording();
        }
      },

      onError: (errorType) => {
        setIsListening(false);
        handleDictationError(errorType);
      },

      onAudioLevel: (level) => {
        setAudioLevel(level);
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
  if (!isActive) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 animate-in slide-in-from-bottom">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-medium text-sm">Listening...</span>
        </div>
        <Button onClick={onStop} size="sm" variant="ghost">
          <MicOff className="w-4 h-4" />
        </Button>
      </div>

      {/* Audio Waveform Visualization */}
      <div className="flex items-center justify-center gap-1 h-12 mb-3">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-blue-500 rounded-full animate-pulse"
            style={{
              height: `${Math.random() * 100}%`,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>

      {/* Interim Text */}
      {interimText && (
        <div className="text-sm text-gray-600 italic border-t border-gray-100 pt-3">
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

