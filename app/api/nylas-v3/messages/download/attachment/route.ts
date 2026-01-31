
export const dynamic = 'force-dynamic';
/**
 * Nylas v3 Attachment Download API
 * GET /api/nylas-v3/messages/download/attachment
 * Downloads an attachment from an email
 *
 * Query params:
 * - accountId: The Nylas grant ID
 * - messageId: The message ID
 * - attachmentId: The attachment ID (can contain special characters)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get parameters from query string
    const accountId = request.nextUrl.searchParams.get('accountId');
    const messageId = request.nextUrl.searchParams.get('messageId');
    const attachmentId = request.nextUrl.searchParams.get('attachmentId');

    if (!accountId || !messageId || !attachmentId) {
      return NextResponse.json(
        { error: 'Missing required parameters: accountId, messageId, or attachmentId' },
        { status: 400 }
      );
    }

    console.log(`📎 Downloading attachment`, {
      messageId: messageId.substring(0, 30) + '...',
      attachmentId: attachmentId.substring(0, 30) + '...',
      accountId: accountId.substring(0, 10) + '...'
    });

    // Get Nylas client
    const nylas = getNylasClient();

    // Download attachment from Nylas v3
    const response = await nylas.attachments.download({
      identifier: accountId,
      attachmentId: attachmentId,
      queryParams: {
        messageId: messageId,
      },
    });

    // The response contains the binary data as a ReadableStream
    // For Nylas v3, the response itself is the stream with metadata properties
    const attachmentData = response as any;

    // Get metadata from the response
    const contentType = attachmentData.contentType || 'application/octet-stream';
    const filename = attachmentData.filename || 'download';

    console.log(`✅ Downloaded attachment: ${filename} (${contentType})`);

    // Return the attachment data as a blob
    return new NextResponse(attachmentData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error: any) {
    console.error('❌ Download attachment error:', error);

    return NextResponse.json(
      {
        error: 'Failed to download attachment',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
