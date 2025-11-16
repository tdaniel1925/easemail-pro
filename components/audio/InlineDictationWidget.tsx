/**
 * InlineDictationWidget Component
 * 
 * Inline dictation interface with real-time waveform visualization
 * Features:
 * - No modal - appears inline in composer
 * - Real Web Speech API transcription
 * - Real-time waveform animation with audio level detection
 * - Transcription displayed in colored message box
 * - Professional corporate design
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Sparkles, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WaveformVisualizer } from '@/components/audio/WaveformVisualizer';
import { 
  DictationService, 
  SmartPunctuationProcessor 
} from '@/lib/ai/dictation-service';
import { cn } from '@/lib/utils';

interface InlineDictationWidgetProps {
  onComplete: (text: string) => void;
  onCancel: () => void;
  userTier?: 'free' | 'pro' | 'business';
}

export function InlineDictationWidget({
  onComplete,
  onCancel,
  userTier = 'free',
}: InlineDictationWidgetProps) {
  const [audioLevel, setAudioLevel] = useState(0);
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [accumulatedText, setAccumulatedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dictationRef = useRef<DictationService | null>(null);
  const punctuationRef = useRef(new SmartPunctuationProcessor());
  const fullTranscriptRef = useRef<string>('');
  
  // Audio analysis refs for direct audio level detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>();
  const isListeningRef = useRef(false);

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

  // Function to update audio level from analyser
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || !isListeningRef.current) {
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average audio level
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    const normalizedLevel = (average / 255) * 100;
    
    // Apply amplification for better visibility (similar to voice message mode)
    setAudioLevel(Math.min(100, Math.round(normalizedLevel * 1.5)));

    if (isListeningRef.current) {
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, []);

  // Start dictation
  const handleStart = async () => {
    if (!dictationRef.current || !isSupported) {
      return;
    }

    setError(null);
    setInterimText('');
    setAccumulatedText('');
    fullTranscriptRef.current = '';

    // Get microphone stream for audio analysis
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false, // Better for visualization
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Set up audio analysis (same as voice message mode)
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    } catch (error) {
      console.error('Failed to setup audio visualization:', error);
      // Don't fail dictation if visualization setup fails
    }

    await dictationRef.current.startDictation({
      onStart: () => {
        setIsListening(true);
        isListeningRef.current = true;
        console.log('[Dictation] Started listening');
        
        // Start audio level monitoring after listening begins
        if (analyserRef.current) {
          updateAudioLevel();
        }
      },

      onResult: (result) => {
        // Process with smart punctuation
        const processed = punctuationRef.current.process(
          result.text,
          result.isFinal
        );

        if (result.isFinal) {
          // Final text - add to accumulated text
          const newText = processed + ' ';
          fullTranscriptRef.current += newText;
          setAccumulatedText(prev => prev + newText);
          setInterimText('');
        } else {
          // Interim text - show as preview
          setInterimText(processed);
        }
      },

      onEnd: () => {
        setIsListening(false);
        isListeningRef.current = false;
        console.log('[Dictation] Stopped listening');
        
        // Cleanup audio analysis
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        setAudioLevel(0);
      },

      onError: (errorType) => {
        setIsListening(false);
        isListeningRef.current = false;
        handleDictationError(errorType);
        
        // Cleanup on error
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        setAudioLevel(0);
      },
    });
  };

  // Stop dictation
  const handleStop = () => {
    if (dictationRef.current) {
      dictationRef.current.stopDictation();
      setIsListening(false);
      isListeningRef.current = false;
      setAudioLevel(0);
      setIsProcessing(true);
      
      // Cleanup audio resources
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      
      // Process the complete transcript
      setTimeout(() => {
        const fullText = fullTranscriptRef.current.trim();
        onComplete(fullText);
        setIsProcessing(false);
      }, 300);
    }
  };

  // Handle start/stop toggle
  const handleStartStop = () => {
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
  }, []);

  return (
    <div className="my-4 p-5 border border-border rounded-xl bg-gradient-to-br from-card via-card to-muted/10 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200",
              isListening ? "bg-primary/10 ring-1 ring-primary/20" : "bg-muted/50"
            )}>
              <Mic className={cn(
                "w-5 h-5 transition-colors duration-200",
                isListening ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            {isListening && (
              <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary animate-ping opacity-30" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Dictation Ready'}
            </span>
            {userTier !== 'free' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium w-fit mt-1">
                {userTier.toUpperCase()}
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
          audioLevel={audioLevel}
          isActive={isListening}
          barCount={60}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm text-destructive flex-1 font-medium">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Transcription Display */}
      {(accumulatedText || interimText) && (
        <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
            <div className="text-sm flex-1 space-y-1">
              <span className="text-foreground font-medium leading-relaxed block">{accumulatedText}</span>
              {interimText && (
                <span className="text-muted-foreground italic block animate-pulse">{interimText}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Control Button */}
      <div className="flex justify-center">
        <Button
          variant={isListening ? "destructive" : "default"}
          size="lg"
          onClick={handleStartStop}
          disabled={isProcessing || !isSupported}
          className={cn(
            "gap-2 min-w-[220px] h-11 text-base font-semibold transition-all duration-200",
            isListening && "shadow-md hover:shadow-lg",
            !isListening && "shadow-sm hover:shadow-md"
          )}
        >
          {isProcessing ? (
            <>
              <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : isListening ? (
            <>
              <Square className="w-5 h-5" />
              Stop & Process
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Dictation
            </>
          )}
        </Button>
      </div>

      {/* Helper Text */}
      {!isListening && !isProcessing && !error && (
        <p className="text-xs text-center text-muted-foreground mt-4 font-medium">
          Click to start speaking. Your words will be transcribed in real-time.
        </p>
      )}
    </div>
  );
}

