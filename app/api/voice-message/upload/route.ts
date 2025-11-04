/**
 * Voice Message Upload API
 * POST /api/voice-message/upload
 * 
 * Upload voice messages to Supabase Storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Get form data
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;
    const duration = formData.get('duration') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // 2. Validate file
    const maxSize = 25 * 1024 * 1024; // 25 MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25 MB.' },
        { status: 400 }
      );
    }

    // 3. Get user ID (TODO: integrate with your auth)
    const userId = req.headers.get('x-user-id') || 'anonymous';

    // 4. Upload to Supabase Storage
    const supabase = await createClient();
    const filename = `${userId}/${Date.now()}-${audioFile.name}`;

    const { data, error } = await supabase.storage
      .from('voice-messages')
      .upload(filename, audioFile, {
        contentType: audioFile.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload voice message' },
        { status: 500 }
      );
    }

    // 5. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('voice-messages')
      .getPublicUrl(filename);

    // 6. Return result
    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: audioFile.name,
      size: audioFile.size,
      duration: parseInt(duration) || 0,
    });

  } catch (error: any) {
    console.error('Voice message upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload voice message',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

