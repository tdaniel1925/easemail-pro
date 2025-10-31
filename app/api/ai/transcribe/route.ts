/**
 * OpenAI Whisper Transcription API Endpoint
 * 
 * Premium feature for high-accuracy transcription
 * Used for:
 * - Post-processing enhancement of dictated text
 * - Transcribing voice messages
 * - Fallback for browsers without Web Speech API
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limiting configuration
const RATE_LIMITS = {
  free: {
    minutesPerDay: 0, // No Whisper access for free tier
    minutesPerMonth: 0,
  },
  pro: {
    minutesPerDay: 30,
    minutesPerMonth: 300,
  },
  business: {
    minutesPerDay: Infinity,
    minutesPerMonth: Infinity,
  },
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    // TODO: Replace with your auth system
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get user tier and check limits
    // TODO: Replace with your database query
    const userTier = await getUserTier(userId);
    const usage = await getDictationUsage(userId);

    if (!canUseWhisper(userTier, usage)) {
      return NextResponse.json(
        {
          error: 'Usage limit reached',
          message: 'Upgrade to Pro for high-accuracy transcription',
          upgradeUrl: '/pricing',
          remainingMinutes: 0,
        },
        { status: 429 }
      );
    }

    // 3. Parse request
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;
    const language = (formData.get('language') as string) || 'en';
    const purpose = (formData.get('purpose') as string) || 'transcription'; // 'transcription' | 'enhancement'

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // 4. Validate file
    const maxSize = 25 * 1024 * 1024; // 25 MB (Whisper limit)
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25 MB.' },
        { status: 400 }
      );
    }

    const validTypes = ['audio/webm', 'audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
    if (!validTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Invalid audio type. Supported: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // 5. Call OpenAI Whisper API
    console.log(`🎤 Transcribing audio for user ${userId}...`);
    const startTime = Date.now();

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language,
      response_format: 'verbose_json', // Get detailed info
      temperature: 0.2, // Lower = more consistent
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Transcription complete in ${processingTime}ms`);

    // 6. Track usage
    const durationMinutes = Math.ceil(transcription.duration / 60);
    await trackWhisperUsage(userId, durationMinutes);

    // 7. Calculate cost (for internal tracking)
    const cost = (transcription.duration / 60) * 0.006; // $0.006 per minute

    // 8. Return result
    return NextResponse.json({
      success: true,
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
      segments: transcription.segments, // Word-level timestamps
      metadata: {
        model: 'whisper-1',
        processingTime,
        cost,
        usageMinutes: durationMinutes,
      },
    });

  } catch (error: any) {
    console.error('❌ Transcription error:', error);

    // Handle specific OpenAI errors
    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.status === 400) {
      return NextResponse.json(
        { error: 'Invalid audio file or parameters.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Transcription failed',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions (TODO: Move to separate service file)
// ============================================================================

async function getUserTier(userId: string): Promise<'free' | 'pro' | 'business'> {
  // TODO: Query your database
  // For now, return free tier
  return 'free';
}

async function getDictationUsage(userId: string): Promise<{
  dailyMinutes: number;
  monthlyMinutes: number;
}> {
  // TODO: Query your database
  // For now, return 0
  return {
    dailyMinutes: 0,
    monthlyMinutes: 0,
  };
}

function canUseWhisper(
  tier: 'free' | 'pro' | 'business',
  usage: { dailyMinutes: number; monthlyMinutes: number }
): boolean {
  const limits = RATE_LIMITS[tier];
  
  if (usage.dailyMinutes >= limits.minutesPerDay) {
    return false;
  }
  
  if (usage.monthlyMinutes >= limits.minutesPerMonth) {
    return false;
  }
  
  return true;
}

async function trackWhisperUsage(userId: string, minutes: number): Promise<void> {
  // TODO: Update your database
  console.log(`📊 Tracked ${minutes} minutes for user ${userId}`);
}

// ============================================================================
// Optional: Enhancement Endpoint
// ============================================================================

/**
 * POST /api/ai/enhance-transcript
 * 
 * Takes real-time transcription and enhances it with Whisper
 * for better punctuation, grammar, and accuracy
 */
export async function PUT(req: NextRequest) {
  try {
    const { text, audioBlob } = await req.json();
    
    // Convert base64 audio to File
    const audioFile = base64ToFile(audioBlob, 'enhancement.webm');
    
    // Get high-accuracy transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'text',
      temperature: 0.0, // Maximum consistency
    });
    
    return NextResponse.json({
      original: text,
      enhanced: transcription,
      improvements: calculateImprovements(text, transcription),
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function base64ToFile(base64: string, filename: string): File {
  const byteString = atob(base64.split(',')[1]);
  const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
  
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  
  return new File([ab], filename, { type: mimeString });
}

function calculateImprovements(original: string, enhanced: string) {
  return {
    punctuationAdded: (enhanced.match(/[.,!?]/g) || []).length - 
                     (original.match(/[.,!?]/g) || []).length,
    wordsChanged: calculateWordDiff(original, enhanced),
    confidence: 0.95,
  };
}

function calculateWordDiff(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  let different = 0;
  const maxLength = Math.max(words1.length, words2.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (words1[i] !== words2[i]) {
      different++;
    }
  }
  
  return different;
}

