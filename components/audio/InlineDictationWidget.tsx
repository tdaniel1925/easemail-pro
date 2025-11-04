/**
 * InlineDictationWidget Component
 * 
 * Inline dictation interface with real-time waveform visualization
 * Features:
 * - No modal - appears inline in composer
 * - Real-time waveform animation
 * - Transcription displayed in colored message box
 * - Professional corporate design
 */

'use client';

import { useState, useEffect } from 'react';
import { Mic, Square, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WaveformVisualizer } from '@/components/audio/WaveformVisualizer';
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

  // Mock audio level simulation (will be replaced with real audio input)
  useEffect(() => {
    if (!isListening) return;

    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isListening]);

  const handleStartStop = () => {
    if (isListening) {
      // Stop listening
      setIsListening(false);
      setAudioLevel(0);
      setIsProcessing(true);
      
      // Simulate processing time
      setTimeout(() => {
        const fullText = accumulatedText + (interimText ? ' ' + interimText : '');
        onComplete(fullText);
      }, 500);
    } else {
      // Start listening
      setIsListening(true);
      setAccumulatedText('');
      setInterimText('');
    }
  };

  // Simulate transcription (will be replaced with real Web Speech API)
  useEffect(() => {
    if (!isListening) return;

    const phrases = [
      'Hello, I would like to',
      'schedule a meeting',
      'to discuss the project',
      'next week if possible',
    ];

    let currentPhrase = 0;
    const interval = setInterval(() => {
      if (currentPhrase < phrases.length) {
        setAccumulatedText(prev => prev + (prev ? ' ' : '') + phrases[currentPhrase]);
        currentPhrase++;
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isListening]);

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

      {/* Transcription Display */}
      {(accumulatedText || interimText) && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
            <div className="text-sm flex-1">
              <span className="text-foreground">{accumulatedText}</span>
              {interimText && (
                <span className="text-muted-foreground italic"> {interimText}</span>
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
          disabled={isProcessing}
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
      {!isListening && !isProcessing && (
        <p className="text-xs text-center text-muted-foreground mt-3">
          Click to start speaking. Your words will be transcribed in real-time.
        </p>
      )}
    </div>
  );
}

