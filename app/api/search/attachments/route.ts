/**
 * Attachments Search API
 * GET /api/search/attachments
 * Search email attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Nylas from 'nylas';

export const dynamic = 'force-dynamic';

const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required',
      }, { status: 400 });
    }

    console.log(`[Attachment Search] Searching for "${query}"`);

    // Strategy: Search for messages with attachments, then filter attachments by filename
    // This is more efficient than fetching all messages

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Account ID is required for attachment search',
      }, { status: 400 });
    }

    // Search for messages with attachments using Nylas v3
    const messages = await nylas.messages.list({
      identifier: accountId,
      queryParams: {
        has_attachment: true,
        limit: 100, // Fetch more to increase chance of matches
      },
    });

    // Filter messages and attachments by query
    const queryLower = query.toLowerCase();
    const attachmentResults: any[] = [];

    for (const message of messages.data) {
      if (!message.attachments || message.attachments.length === 0) continue;

      // Filter attachments by filename
      const matchingAttachments = message.attachments.filter((att: any) => {
        const filename = (att.filename || '').toLowerCase();
        const contentType = (att.contentType || '').toLowerCase();
        return filename.includes(queryLower) || contentType.includes(queryLower);
      });

      // Add matching attachments to results
      for (const attachment of matchingAttachments) {
        attachmentResults.push({
          id: attachment.id,
          filename: attachment.filename,
          content_type: attachment.contentType,
          size: attachment.size,
          message_id: message.id,
          message_subject: message.subject,
          message_from: message.from,
          message_date: message.date,
        });

        // Stop if we've reached the limit
        if (attachmentResults.length >= limit) break;
      }

      if (attachmentResults.length >= limit) break;
    }

    const took_ms = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      attachments: attachmentResults.slice(0, limit),
      total: attachmentResults.length,
      took_ms,
    });
  } catch (error: any) {
    console.error('❌ Attachment search error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Attachment search failed',
        details: error.message,
        took_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
