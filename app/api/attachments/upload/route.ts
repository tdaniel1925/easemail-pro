/**
 * Upload API Route
 * POST /api/attachments/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    const userId = '00000000-0000-0000-0000-000000000000'; // Test user
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Upload to Supabase Storage
    const supabase = createClient();
    const storagePath = `${userId}/manual/${Date.now()}_${file.name}`;
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(storagePath);

    // Create attachment record
    const [newAttachment] = await db.insert(attachments).values({
      userId,
      filename: file.name,
      fileExtension: extension,
      mimeType: file.type,
      fileSizeBytes: file.size,
      storagePath,
      storageUrl: urlData.publicUrl,
      emailSubject: 'Manual Upload',
      senderEmail: null,
      senderName: 'You',
      emailDate: new Date(),
      processingStatus: 'pending',
      aiProcessed: false,
    }).returning();

    console.log(`📎 Manual upload: ${file.name} (${file.size} bytes)`);

    return NextResponse.json({
      success: true,
      attachment: newAttachment,
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

