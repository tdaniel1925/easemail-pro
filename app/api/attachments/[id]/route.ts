/**
 * Attachment Detail API Route
 * GET /api/attachments/[id]
 * GET /api/attachments/[id]/preview
 * GET /api/attachments/[id]/download
 *
 * ✅ ON-DEMAND MODE: Proxies attachments from Nylas (no local storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import Nylas from 'nylas';

// Initialize Nylas client
const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

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
      // Check if we have Nylas IDs (new on-demand mode)
      if (attachment.nylasAttachmentId && attachment.nylasMessageId && attachment.nylasGrantId) {
        try {
          // Download from Nylas
          const fileData = await nylas.attachments.download({
            identifier: attachment.nylasGrantId,
            attachmentId: attachment.nylasAttachmentId,
            queryParams: {
              messageId: attachment.nylasMessageId,
            },
          });

          const mimeType = attachment.mimeType || 'application/octet-stream';

          // Convert buffer to base64 data URL for preview
          const base64 = fileData.toString('base64');
          const dataUrl = `data:${mimeType};base64,${base64}`;

          return NextResponse.json({
            url: dataUrl,
            type: mimeType.startsWith('image/') ? 'image' :
                  mimeType === 'application/pdf' ? 'pdf' :
                  'unsupported',
          });
        } catch (error) {
          console.error('Nylas download error:', error);
          return NextResponse.json(
            { error: 'Failed to fetch attachment from Nylas' },
            { status: 500 }
          );
        }
      }

      // Legacy: Fall back to Supabase storage if available
      if (attachment.storagePath) {
        // Import lazily to avoid errors if not needed
        const { getAttachmentUrl } = await import('@/lib/attachments/upload');
        const url = await getAttachmentUrl(attachment.storagePath, 3600);
        const mimeType = attachment.mimeType || '';

        return NextResponse.json({
          url,
          type: mimeType.startsWith('image/') ? 'image' :
                mimeType === 'application/pdf' ? 'pdf' :
                'unsupported',
        });
      }

      return NextResponse.json(
        { error: 'No attachment data available' },
        { status: 404 }
      );
    }

    // Handle download request
    if (isDownload) {
      // Check if we have Nylas IDs (new on-demand mode)
      if (attachment.nylasAttachmentId && attachment.nylasMessageId && attachment.nylasGrantId) {
        try {
          // Download from Nylas
          const fileData = await nylas.attachments.download({
            identifier: attachment.nylasGrantId,
            attachmentId: attachment.nylasAttachmentId,
            queryParams: {
              messageId: attachment.nylasMessageId,
            },
          });

          const mimeType = attachment.mimeType || 'application/octet-stream';

          // Return file directly as a download
          return new NextResponse(fileData, {
            headers: {
              'Content-Type': mimeType,
              'Content-Disposition': `attachment; filename="${attachment.filename}"`,
              'Content-Length': fileData.length.toString(),
            },
          });
        } catch (error) {
          console.error('Nylas download error:', error);
          return NextResponse.json(
            { error: 'Failed to download attachment from Nylas' },
            { status: 500 }
          );
        }
      }

      // Legacy: Fall back to Supabase storage if available
      if (attachment.storagePath) {
        const { getAttachmentUrl } = await import('@/lib/attachments/upload');
        const url = await getAttachmentUrl(attachment.storagePath, 3600);

        return NextResponse.json({
          url,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.fileSizeBytes,
        });
      }

      return NextResponse.json(
        { error: 'No attachment data available' },
        { status: 404 }
      );
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
