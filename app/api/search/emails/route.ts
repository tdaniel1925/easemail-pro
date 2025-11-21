/**
 * Email Search API (Nylas v3)
 * GET /api/search/emails
 * Search emails using Nylas v3 search query
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
    const accountId = searchParams.get('accountId');
    const query = searchParams.get('query');
    const folderId = searchParams.get('folderId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!accountId) {
      return NextResponse.json({
        success: false,
        error: 'Account ID is required',
      }, { status: 400 });
    }

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Search query is required',
      }, { status: 400 });
    }

    console.log(`[Email Search] Searching for "${query}" in account ${accountId}`);

    // Build Nylas v3 search query
    // Nylas supports native search with the 'search_query_native' parameter
    const searchQuery: any = {
      limit,
      search_query_native: query, // Native provider search (Gmail, Outlook, etc.)
    };

    // Add folder filter if specified
    if (folderId) {
      searchQuery.in = [folderId];
    }

    // Search messages using Nylas v3
    const messages = await nylas.messages.list({
      identifier: accountId,
      queryParams: searchQuery,
    });

    // Format results
    const emails = messages.data.map((msg: any) => ({
      id: msg.id,
      thread_id: msg.threadId,
      subject: msg.subject || '(No Subject)',
      from: msg.from || [],
      to: msg.to || [],
      cc: msg.cc || [],
      date: msg.date,
      snippet: msg.snippet || '',
      unread: msg.unread || false,
      starred: msg.starred || false,
      hasAttachments: (msg.attachments?.length || 0) > 0,
      folders: msg.folders || [],
      labels: msg.labels || [],
    }));

    const took_ms = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      emails,
      total: emails.length,
      took_ms,
    });
  } catch (error: any) {
    console.error('❌ Email search error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Email search failed',
        details: error.message,
        took_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
