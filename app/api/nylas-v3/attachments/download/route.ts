/**
 * Nylas v3 Attachment Download API (PRD Implementation)
 * GET /api/nylas-v3/attachments/download
 * Downloads an attachment from an email using Nylas v3 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const grantId = searchParams.get('grantId') || searchParams.get('accountId'); // Support both
  const attachmentId = searchParams.get('attachmentId');
  const messageId = searchParams.get('messageId');
  const filename = searchParams.get('filename') || 'attachment';

  console.log('[API] =================================');
  console.log('[API] Attachment Download Request');
  console.log('[API] =================================');
  console.log('[API] Timestamp:', new Date().toISOString());
  console.log('[API] Grant ID:', grantId);
  console.log('[API] Message ID:', messageId);
  console.log('[API] Attachment ID:', attachmentId);
  console.log('[API] Filename:', filename);

  // Authenticate user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('[API] Unauthorized request');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Validate required parameters
  if (!grantId) {
    console.error('[API] Missing grantId/accountId parameter');
    return NextResponse.json(
      { error: 'Grant ID is required' },
      { status: 400 }
    );
  }

  if (!attachmentId) {
    console.error('[API] Missing attachmentId parameter');
    return NextResponse.json(
      { error: 'Attachment ID is required' },
      { status: 400 }
    );
  }

  if (!messageId) {
    console.error('[API] Missing messageId parameter');
    return NextResponse.json(
      { error: 'Message ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log('[API] Calling Nylas API...');
    console.log('[API] Endpoint: /v3/grants/' + grantId + '/attachments/' + attachmentId + '/download');

    // Get Nylas client
    const nylas = getNylasClient();

    // Download attachment from Nylas v3
    // NOTE: The SDK v6 download() method returns a ReadableStream, not an object with .data
    const attachmentStream = await nylas.attachments.download({
      identifier: grantId,
      attachmentId: attachmentId,
      queryParams: {
        messageId: messageId,
      },
    });

    console.log('[API] ✅ Successfully received attachment stream');
    console.log('[API] Stream type:', typeof attachmentStream);
    console.log('[API] Is ReadableStream:', attachmentStream instanceof ReadableStream);

    // Determine content type from filename extension
    const contentType = getContentType(filename);

    console.log('[API] Content-Type:', contentType);

    // Return the stream directly with appropriate headers
    // NextResponse can handle ReadableStream natively
    return new NextResponse(attachmentStream as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[API] ❌ Download failed');
    console.error('[API] Error message:', error.message);
    console.error('[API] Error stack:', error.stack);

    // Return detailed error for debugging
    return NextResponse.json(
      {
        error: 'Failed to download attachment',
        details: error.message,
        grantId,
        attachmentId,
      },
      { status: 500 }
    );
  }
}

/**
 * Get MIME type from filename extension
 */
function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',

    // Text
    txt: 'text/plain',
    csv: 'text/csv',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    json: 'application/json',
    xml: 'application/xml',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',

    // Video
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',

    // Other
    ics: 'text/calendar',
    vcf: 'text/vcard',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}
