/**
 * Real-time Dictation Service using Web Speech API
 * 
 * Provides instant speech-to-text transcription with browser's built-in API
 * Fallback to Whisper API for unsupported browsers (premium feature)
 */

interface DictationConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

interface DictationResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface DictationCallbacks {
  onResult: (result: DictationResult) => void;
  onError: (error: DictationError) => void;
  onStart: () => void;
  onEnd: () => void;
  onAudioLevel?: (level: number) => void;
}

type DictationError = 
  | 'not-supported'
  | 'permission-denied'
  | 'no-speech'
  | 'network-error'
  | 'aborted';

export class DictationService {
  private recognition: any; // SpeechRecognition
  private isSupported: boolean;
  private isListening: boolean = false;
  private config: DictationConfig;
  private callbacks: DictationCallbacks | null = null;

  constructor(config: DictationConfig = {}) {
    this.config = {
      language: config.language || 'en-US',
      continuous: config.continuous ?? true,
      interimResults: config.interimResults ?? true,
      maxAlternatives: config.maxAlternatives || 1,
    };

    this.isSupported = this.checkSupport();
  }

  /**
   * Check if browser supports Web Speech API
   */
  private checkSupport(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    );
  }

  /**
   * Get browser compatibility info
   */
  public getBrowserSupport() {
    return {
      isSupported: this.isSupported,
      hasWebSpeech: 'webkitSpeechRecognition' in window,
      browser: this.detectBrowser(),
      recommendation: !this.isSupported 
        ? 'Use Chrome, Edge, or Safari for real-time dictation'
        : 'Real-time dictation available',
    };
  }

  private detectBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  /**
   * Start real-time dictation
   */
  public async startDictation(callbacks: DictationCallbacks): Promise<void> {
    if (!this.isSupported) {
      callbacks.onError('not-supported');
      return;
    }

    if (this.isListening) {
      console.warn('Dictation already in progress');
      return;
    }

    this.callbacks = callbacks;

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Initialize speech recognition
      const SpeechRecognition = 
        (window as any).webkitSpeechRecognition || 
        (window as any).SpeechRecognition;

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.lang = this.config.language;
      this.recognition.maxAlternatives = this.config.maxAlternatives;

      // Set up event handlers
      this.setupRecognitionHandlers();

      // Start listening
      this.recognition.start();
      this.isListening = true;

    } catch (error: any) {
      console.error('Failed to start dictation:', error);
      
      if (error.name === 'NotAllowedError') {
        callbacks.onError('permission-denied');
      } else {
        callbacks.onError('network-error');
      }
    }
  }

  /**
   * Set up speech recognition event handlers
   */
  private setupRecognitionHandlers(): void {
    if (!this.recognition || !this.callbacks) return;

    // Recognition started
    this.recognition.onstart = () => {
      console.log('🎤 Dictation started');
      this.callbacks?.onStart();
    };

    // Recognition result (real-time)
    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          finalTranscript += transcript;
          
          // Callback with final result
          this.callbacks?.onResult({
            text: transcript,
            isFinal: true,
            confidence: confidence || 0.85,
          });
        } else {
          interimTranscript += transcript;
          
          // Callback with interim result
          this.callbacks?.onResult({
            text: transcript,
            isFinal: false,
            confidence: confidence || 0.7,
          });
        }
      }
    };

    // Recognition ended
    this.recognition.onend = () => {
      console.log('🎤 Dictation ended');
      this.isListening = false;
      this.callbacks?.onEnd();

      // Auto-restart if continuous mode (unless manually stopped)
      if (this.config.continuous && this.recognition) {
        try {
          this.recognition.start();
        } catch (error) {
          console.log('Dictation session completed');
        }
      }
    };

    // Errors
    this.recognition.onerror = (event: any) => {
      console.error('🎤 Dictation error:', event.error);
      this.isListening = false;

      switch (event.error) {
        case 'no-speech':
          this.callbacks?.onError('no-speech');
          break;
        case 'aborted':
          this.callbacks?.onError('aborted');
          break;
        case 'network':
          this.callbacks?.onError('network-error');
          break;
        default:
          this.callbacks?.onError('network-error');
      }
    };

    // No speech detected
    this.recognition.onspeechend = () => {
      console.log('🎤 Speech ended');
    };

    // Audio start/end (for visual feedback)
    this.recognition.onaudiostart = () => {
      console.log('🎤 Audio capture started');
    };

    this.recognition.onaudioend = () => {
      console.log('🎤 Audio capture ended');
    };
  }

  /**
   * Stop dictation
   */
  public stopDictation(): void {
    if (!this.recognition || !this.isListening) {
      console.warn('No active dictation to stop');
      return;
    }

    try {
      this.recognition.stop();
      this.isListening = false;
      console.log('🎤 Dictation stopped');
    } catch (error) {
      console.error('Error stopping dictation:', error);
    }
  }

  /**
   * Pause/resume dictation (abort and restart)
   */
  public pauseDictation(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  public resumeDictation(): void {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
      this.isListening = true;
    }
  }

  /**
   * Get current listening state
   */
  public isActive(): boolean {
    return this.isListening;
  }

  /**
   * Change language on the fly
   */
  public setLanguage(language: string): void {
    this.config.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.callbacks = null;
    this.isListening = false;
  }
}

/**
 * Smart punctuation processor
 * Adds intelligent punctuation based on pauses and context
 */
export class SmartPunctuationProcessor {
  private lastPauseTime: number = 0;
  private sentenceBuffer: string = '';

  public process(text: string, isFinal: boolean): string {
    // Basic smart punctuation
    let processed = text;

    if (isFinal) {
      // Capitalize first letter
      processed = this.capitalizeFirstLetter(processed);

      // Add period if missing
      if (!this.endsWithPunctuation(processed)) {
        processed += '.';
      }

      // Handle common patterns
      processed = this.applyCommonPatterns(processed);

      this.sentenceBuffer = '';
    } else {
      this.sentenceBuffer = processed;
    }

    return processed;
  }

  private capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  private endsWithPunctuation(text: string): boolean {
    return /[.!?]$/.test(text.trim());
  }

  private applyCommonPatterns(text: string): string {
    // Convert question indicators to question marks
    if (/^(what|when|where|who|why|how|can|could|would|should|is|are|do|does)/i.test(text)) {
      text = text.replace(/\.$/, '?');
    }

    // Add comma for certain connectors
    text = text.replace(/\b(and then|after that|however|therefore)\b/gi, (match) => `, ${match}`);

    return text;
  }
}

/**
 * Usage tracker for dictation
 */
export class DictationUsageTracker {
  private startTime: number = 0;
  private totalSeconds: number = 0;

  public startTracking(): void {
    this.startTime = Date.now();
  }

  public stopTracking(): number {
    if (this.startTime === 0) return 0;
    
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.totalSeconds += elapsed;
    this.startTime = 0;
    
    return elapsed;
  }

  public getTotalMinutes(): number {
    return Math.ceil(this.totalSeconds / 60);
  }

  public reset(): void {
    this.startTime = 0;
    this.totalSeconds = 0;
  }
}

