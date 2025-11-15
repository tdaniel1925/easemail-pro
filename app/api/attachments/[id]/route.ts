/**
 * Attachment Detail API Route
 * GET /api/attachments/[id]
 * GET /api/attachments/[id]/preview
 * GET /api/attachments/[id]/download
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getAttachmentUrl } from '@/lib/attachments/upload';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const { id: attachmentId } = await params;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if this is a preview or download request
    const pathname = request.nextUrl.pathname;
    const isPreview = pathname.endsWith('/preview');
    const isDownload = pathname.endsWith('/download');

    // Fetch attachment
    const { data: attachment, error } = await supabase
      .from('attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('user_id', userId)
      .single();

    if (error || !attachment) {
      console.error('Attachment fetch error:', {
        attachmentId,
        userId,
        error: error?.message,
        code: error?.code,
      });
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Handle preview request
    if (isPreview) {
      // Use thumbnail if available, otherwise use original
      const path = attachment.thumbnail_path || attachment.storage_path;
      const url = await getAttachmentUrl(path, 3600); // 1 hour expiry

      return NextResponse.json({
        url,
        type: attachment.mime_type.startsWith('image/') ? 'image' : 
              attachment.mime_type === 'application/pdf' ? 'pdf' : 
              'unsupported',
      });
    }

    // Handle download request
    if (isDownload) {
      const url = await getAttachmentUrl(attachment.storage_path, 3600);

      // Increment access count
      await supabase.rpc('increment_attachment_access', {
        attachment_uuid: attachmentId,
      });

      return NextResponse.json({
        url,
        filename: attachment.filename,
        mimeType: attachment.mime_type,
        sizeBytes: attachment.file_size_bytes,
      });
    }

    // Default: return attachment details
    return NextResponse.json({ attachment });
  } catch (error) {
    console.error('Attachment detail API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

