import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, emailAccounts, emails, contacts } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// Force dynamic rendering - this route uses cookies
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch stats
    const [
      totalUsersResult,
      totalAccountsResult,
      totalEmailsResult,
      totalContactsResult,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(emailAccounts),
      db.select({ count: sql<number>`count(*)::int` }).from(emails),
      db.select({ count: sql<number>`count(*)::int` }).from(contacts),
    ]);

    const stats = {
      totalUsers: totalUsersResult[0]?.count || 0,
      totalAccounts: totalAccountsResult[0]?.count || 0,
      totalEmails: totalEmailsResult[0]?.count || 0,
      totalContacts: totalContactsResult[0]?.count || 0,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

