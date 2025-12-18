/**
 * API Route: Real-Time Folder Counts
 * 
 * Returns live folder counts calculated from local database.
 * Much faster and more accurate than waiting for Nylas sync.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFolderCounts, getFolderCount } from '@/lib/email/folder-counts';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';
export const revalidate = 0; // Never cache - always fresh

/**
 * GET: Fetch real-time folder counts
 * 
 * Query params:
 * - accountId: Required - The email account ID
 * - folder: Optional - Get count for specific folder only
 */
export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');
  const folder = request.nextUrl.searchParams.get('folder');

  if (!accountId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Account ID required' 
    }, { status: 400 });
  }

  try {
    // ✅ Security: Validate account ownership
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Check account belongs to user
    // Note: accountId could be either nylasGrantId (for Nylas accounts) or database ID (for IMAP/JMAP accounts)
    let account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.nylasGrantId, accountId),
    });

    // If not found by nylasGrantId, try by database ID (for IMAP/JMAP accounts)
    if (!account) {
      account = await db.query.emailAccounts.findFirst({
        where: eq(emailAccounts.id, accountId),
      });
    }

    if (!account || account.userId !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Account not found or unauthorized'
      }, { status: 403 });
    }

    // Get counts using the database ID (required by getFolderCount/getFolderCounts)
    const dbAccountId = account.id;

    if (folder) {
      // Single folder count
      const count = await getFolderCount(dbAccountId, folder);
      return NextResponse.json({
        success: true,
        folder,
        ...count,
      });
    } else {
      // All folders
      const result = await getFolderCounts(dbAccountId);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('❌ Folder counts API error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}

