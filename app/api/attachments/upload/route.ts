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
  console.log('🚀 Upload route hit');
  
  try {
    console.log('📎 Upload API called');
    
    // Get authenticated user
    const supabase = createClient();
    console.log('✅ Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Auth check:', { hasUser: !!user, authError });
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    console.log('✅ Authenticated user:', userId);
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No file provided');
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('📁 File received:', file.name, file.size, 'bytes');

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Upload to Supabase Storage
    const storagePath = `${userId}/manual/${Date.now()}_${file.name}`;
    
    console.log('☁️ Uploading to storage:', storagePath);
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    console.log('✅ Storage upload successful');

    // Create a signed URL (valid for 1 hour - enough time to send the email)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (urlError) {
      console.error('❌ Failed to create signed URL:', urlError);
      return NextResponse.json(
        { error: 'Failed to create file URL', details: urlError.message },
        { status: 500 }
      );
    }

    console.log('🔗 Signed URL created (valid for 1 hour)');

    // Create attachment record
    const [newAttachment] = await db.insert(attachments).values({
      userId,
      filename: file.name,
      fileExtension: extension,
      mimeType: file.type,
      fileSizeBytes: file.size,
      storagePath,
      storageUrl: signedUrlData.signedUrl, // Use signed URL instead
      emailSubject: 'Manual Upload',
      senderEmail: null,
      senderName: 'You',
      emailDate: new Date(),
      processingStatus: 'pending',
      aiProcessed: false,
    }).returning();

    console.log('✅ Database record created:', newAttachment.id);

    return NextResponse.json({
      success: true,
      attachment: newAttachment,
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

