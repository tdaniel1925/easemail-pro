/**
 * Attachment Preview API Route
 * GET /api/attachments/[id]/preview
 *
 * Returns attachment content for preview (images, PDFs)
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

        // Convert stream to buffer
        const reader = (fileStream as unknown as ReadableStream<Uint8Array>).getReader();
        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: streamDone } = await reader.read();
          if (value) {
            chunks.push(value);
          }
          done = streamDone;
        }

        // Combine chunks into single buffer
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const buffer = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }

        // Convert buffer to base64 data URL for preview
        const base64 = Buffer.from(buffer).toString('base64');
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
  } catch (error) {
    console.error('Attachment preview API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
