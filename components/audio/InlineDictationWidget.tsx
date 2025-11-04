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

import { useState, useEffect, useRef } from 'react';
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
    setAccumulatedText('');
    fullTranscriptRef.current = '';

    await dictationRef.current.startDictation({
      onStart: () => {
        setIsListening(true);
        console.log('[Dictation] Started listening');
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
        console.log('[Dictation] Stopped listening');
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
      setAudioLevel(0);
      setIsProcessing(true);
      
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

  return (
    <div className="my-4 p-4 border border-border rounded-lg bg-card shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Mic className={cn(
              "w-5 h-5 transition-colors",
              isListening ? "text-primary" : "text-muted-foreground"
            )} />
            {isListening && (
              <div className="absolute inset-0 w-5 h-5 rounded-full bg-primary animate-ping opacity-50" />
            )}
          </div>
          <span className="text-sm font-medium">
            {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Dictation Ready'}
          </span>
          {userTier !== 'free' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {userTier.toUpperCase()}
            </span>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Waveform Visualizer */}
      <div className="mb-3">
        <WaveformVisualizer
          audioLevel={audioLevel}
          isActive={isListening}
          barCount={60}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm text-destructive flex-1">
              {error}
            </div>
          </div>
        </div>
      )}

      {/* Transcription Display */}
      {(accumulatedText || interimText) && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
            <div className="text-sm flex-1">
              <span className="text-foreground">{accumulatedText}</span>
              {interimText && (
                <span className="text-muted-foreground italic">{interimText}</span>
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
          className="gap-2 min-w-[200px]"
        >
          {isProcessing ? (
            <>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : isListening ? (
            <>
              <Square className="w-4 h-4" />
              Stop & Process
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Start Dictation
            </>
          )}
        </Button>
      </div>

      {/* Helper Text */}
      {!isListening && !isProcessing && !error && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Click to start speaking. Your words will be transcribed in real-time.
        </p>
      )}
    </div>
  );
}

