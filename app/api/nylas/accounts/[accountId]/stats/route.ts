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

    // Get email count
    const emailResult = await db
      .select({ count: count() })
      .from(emails)
      .where(eq(emails.accountId, accountId));

    return NextResponse.json({
      success: true,
      folderCount: folderResult[0]?.count || 0,
      emailCount: emailResult[0]?.count || 0,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}

