/**
 * Nylas v3 Folders API Route
 * Fetch and manage folders
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchFolders, sortFolders, buildFolderHierarchy } from '@/lib/nylas-v3/folders';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/nylas-v3/folders
 * Fetch folders for an account
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const hierarchy = searchParams.get('hierarchy') === 'true';

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
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
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

    // 3. Fetch folders from Nylas
    let folders = await fetchFolders(account.nylasGrantId);

    // 4. Sort folders (inbox, sent, etc. first)
    folders = sortFolders(folders);

    // 5. Build hierarchy if requested
    if (hierarchy) {
      folders = buildFolderHierarchy(folders);
    }

    return NextResponse.json({
      success: true,
      folders,
    });
  } catch (error) {
    console.error('❌ Folders API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch folders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
