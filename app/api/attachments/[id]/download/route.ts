/**
 * Attachment Download API Route
 * GET /api/attachments/[id]/download
 *
 * Downloads attachment for saving to disk
 * Proxies from Nylas on-demand
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
      console.error('Attachment not found:', { attachmentId, userId });
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Check if we have Nylas IDs (new on-demand mode)
    if (attachment.nylasAttachmentId && attachment.nylasMessageId && attachment.nylasGrantId) {
      try {
        // Download from Nylas
        const fileStream = await nylas.attachments.download({
          identifier: attachment.nylasGrantId,
          attachmentId: attachment.nylasAttachmentId,
          queryParams: {
            messageId: attachment.nylasMessageId,
          },
        });

        const mimeType = attachment.mimeType || 'application/octet-stream';

        // Return stream directly as a download
        const headers: Record<string, string> = {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        };

        // Add content length if available
        if (attachment.fileSizeBytes) {
          headers['Content-Length'] = attachment.fileSizeBytes.toString();
        }

        return new NextResponse(fileStream as any, { headers });
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
  } catch (error) {
    console.error('Attachment download API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
