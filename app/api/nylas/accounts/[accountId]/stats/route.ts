import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, emailFolders, emails } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const accountId = params.accountId;

    // Get folder count
    const folderResult = await db
      .select({ count: count() })
      .from(emailFolders)
      .where(eq(emailFolders.accountId, accountId));

    // Get total email count
    const emailResult = await db
      .select({ count: count() })
      .from(emails)
      .where(eq(emails.accountId, accountId));

    // ✅ FIX #5: Get per-folder email counts
    const folderEmailCounts = await db
      .select({
        folder: emails.folder,
        count: count()
      })
      .from(emails)
      .where(eq(emails.accountId, accountId))
      .groupBy(emails.folder);

    // Convert to object for easy lookup: { inbox: 1234, sent: 567, ... }
    const folderCounts: Record<string, number> = {};
    folderEmailCounts.forEach(item => {
      if (item.folder) {
        folderCounts[item.folder] = item.count;
      }
    });

    return NextResponse.json({
      success: true,
      folderCount: folderResult[0]?.count || 0,
      emailCount: emailResult[0]?.count || 0,
      folderEmailCounts: folderCounts, // ✅ New: per-folder counts
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

