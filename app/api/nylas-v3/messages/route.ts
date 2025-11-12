/**
 * Nylas v3 Messages API Route
 * On-demand message fetching with cursor-based pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchMessages, fetchMessage } from '@/lib/nylas-v3/messages';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/nylas-v3/messages
 * Fetch messages with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const folderId = searchParams.get('folderId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const cursor = searchParams.get('cursor');
    const unread = searchParams.get('unread');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    // 1. Verify user owns this account
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get account and verify ownership
    // accountId is actually the nylasGrantId, not the database id
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    if (account.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to account' },
        { status: 403 }
      );
    }

    if (!account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Fetch messages from Nylas
    const result = await fetchMessages({
      grantId: account.nylasGrantId,
      folderId: folderId || undefined,
      limit,
      pageToken: cursor || undefined,
      unread: unread === 'true' ? true : unread === 'false' ? false : undefined,
    });

    return NextResponse.json({
      success: true,
      messages: result.messages,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error('❌ Messages API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch messages',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
