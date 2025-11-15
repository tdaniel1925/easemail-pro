/**
 * Attachment Detail API Route
 * GET /api/attachments/[id]
 * GET /api/attachments/[id]/preview
 * GET /api/attachments/[id]/download
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { getAttachmentUrl } from '@/lib/attachments/upload';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attachmentId } = await params;

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Check if this is a preview or download request
    const pathname = request.nextUrl.pathname;
    const isPreview = pathname.endsWith('/preview');
    const isDownload = pathname.endsWith('/download');

    // Fetch attachment using Drizzle
    const [attachment] = await db
      .select()
      .from(attachments)
      .where(and(
        eq(attachments.id, attachmentId),
        eq(attachments.userId, userId)
      ))
      .limit(1);

    if (!attachment) {
      console.error('Attachment fetch error:', {
        attachmentId,
        userId,
        message: 'Attachment not found in database',
      });
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Handle preview request
    if (isPreview) {
      // Use thumbnail if available, otherwise use original
      const path = attachment.thumbnailPath || attachment.storagePath;

      if (!path) {
        return NextResponse.json(
          { error: 'No storage path available' },
          { status: 404 }
        );
      }

      const url = await getAttachmentUrl(path, 3600); // 1 hour expiry
      const mimeType = attachment.mimeType || '';

      return NextResponse.json({
        url,
        type: mimeType.startsWith('image/') ? 'image' :
              mimeType === 'application/pdf' ? 'pdf' :
              'unsupported',
      });
    }

    // Handle download request
    if (isDownload) {
      if (!attachment.storagePath) {
        return NextResponse.json(
          { error: 'No storage path available' },
          { status: 404 }
        );
      }

      const url = await getAttachmentUrl(attachment.storagePath, 3600);

      return NextResponse.json({
        url,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.fileSizeBytes,
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

