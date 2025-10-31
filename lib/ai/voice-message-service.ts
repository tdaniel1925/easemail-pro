/**
 * Voice Message Recorder Service
 * 
 * Record audio messages up to 10 minutes and convert to attachable format
 */

export interface VoiceRecordingConfig {
  maxDuration: number; // seconds
  format: 'webm' | 'mp3';
  bitrate?: number;
}

export interface VoiceRecordingSession {
  id: string;
  status: 'ready' | 'recording' | 'paused' | 'stopped';
  duration: number;
  fileSize: number;
  audioBlob?: Blob;
  audioUrl?: string;
}

export class VoiceMessageRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private config: VoiceRecordingConfig;
  private stream: MediaStream | null = null;

  constructor(config: Partial<VoiceRecordingConfig> = {}) {
    this.config = {
      maxDuration: config.maxDuration || 600, // 10 minutes
      format: config.format || 'webm',
      bitrate: config.bitrate || 128000,
    };
  }

  /**
   * Start recording
   */
  async startRecording(
    onProgress?: (duration: number, size: number) => void
  ): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: this.config.bitrate,
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Progress updates
      const progressInterval = setInterval(() => {
        if (this.mediaRecorder?.state === 'recording') {
          const duration = this.getCurrentDuration();
          const size = this.estimateFileSize(duration);

          onProgress?.(duration, size);

          // Auto-stop at max duration
          if (duration >= this.config.maxDuration) {
            this.stopRecording();
            clearInterval(progressInterval);
          }
        } else {
          clearInterval(progressInterval);
        }
      }, 100);

      // Start recording
      this.mediaRecorder.start(250); // Collect data every 250ms
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Could not access microphone. Please check permissions.');
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, {
          type: this.getSupportedMimeType(),
        });

        // Stop all tracks
        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = null;

        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
      this.pausedDuration += Date.now() - this.startTime;
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
      this.startTime = Date.now();
    }
  }

  /**
   * Get current duration in seconds
   */
  getCurrentDuration(): number {
    if (!this.startTime) return 0;
    const elapsed = Date.now() - this.startTime + this.pausedDuration;
    return Math.floor(elapsed / 1000);
  }

  /**
   * Estimate file size based on duration
   */
  estimateFileSize(durationSeconds: number): number {
    // bitrate is in bits per second, convert to bytes
    return Math.floor((this.config.bitrate! / 8) * durationSeconds);
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * Check if recording is supported
   */
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.mediaRecorder = null;
    this.stream = null;
    this.audioChunks = [];
  }
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

