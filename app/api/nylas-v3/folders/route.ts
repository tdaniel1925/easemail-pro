/**
 * Nylas v3 Folders API Route
 * Fetch and manage folders
 * Includes Redis caching (5 minute TTL)
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchFolders, sortFolders, buildFolderHierarchy } from '@/lib/nylas-v3/folders';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emailFolders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cache } from '@/lib/redis/client';

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
    // accountId could be either nylasGrantId (for Nylas accounts) or database ID (for IMAP accounts)
    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    // If not found by nylasGrantId, try by database ID (for IMAP accounts)
    if (!account) {
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
    }

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

    // Check cache first (5 minute TTL for folders - they don't change often)
    const cacheKey = `folders:${user.id}:${accountId}:${hierarchy}`;
    const cachedFolders = await cache.get<any>(cacheKey);
    if (cachedFolders) {
      console.log(`[Cache HIT] Folders for account ${accountId}`);
      return NextResponse.json(cachedFolders, {
        headers: { 'X-Cache': 'HIT' },
      });
    }

    console.log(`[Cache MISS] Folders for account ${accountId}`);

    const isIMAPAccount = account.provider === 'imap';
    const isJMAPAccount = account.provider === 'jmap';
    const isDirectAccount = isIMAPAccount || isJMAPAccount;

    // Nylas accounts require nylasGrantId
    if (!isDirectAccount && !account.nylasGrantId) {
      return NextResponse.json(
        { error: 'Account not connected to Nylas' },
        { status: 400 }
      );
    }

    // 3. Fetch folders from appropriate source
    let folders;

    if (isDirectAccount) {
      // Fetch from local database for IMAP/JMAP accounts
      console.log(`[Folders] Fetching ${account.provider?.toUpperCase()} folders from database for account:`, account.emailAddress);

      const dbFolders = await db.query.emailFolders.findMany({
        where: eq(emailFolders.accountId, account.id),
      });

      console.log(`[Folders] Found ${dbFolders.length} ${account.provider?.toUpperCase()} folders in database`);

      // Transform database folders to Nylas format
      folders = dbFolders.map(f => ({
        id: f.id,
        name: f.displayName, // Use displayName (the actual folder name)
        folder_type: f.folderType, // normalized type for identification
        parent_id: f.parentFolderId,
        unread_count: f.unreadCount || 0,
        total_count: f.totalCount || 0,
        attributes: [], // IMAP folders don't have attributes in the same way
      }));
    } else {
      // Fetch from Nylas API
      folders = await fetchFolders(account.nylasGrantId!)
;
    }

    // 4. Sort folders (inbox, sent, etc. first)
    folders = sortFolders(folders);

    // 5. Build hierarchy if requested
    if (hierarchy) {
      folders = buildFolderHierarchy(folders);
    }

    // Prepare response
    const responseData = {
      success: true,
      folders,
    };

    // Store in cache with 5 minute TTL (folders don't change often)
    await cache.set(cacheKey, responseData, 300);

    return NextResponse.json(responseData, {
      headers: { 'X-Cache': 'MISS' },
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
