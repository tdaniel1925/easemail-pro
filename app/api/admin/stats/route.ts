import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, emailAccounts, emails, contacts } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

// Force dynamic rendering - this route uses cookies
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized stats access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to access stats', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
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

    logger.admin.info('Admin stats fetched', {
      requestedBy: dbUser.email,
      ...stats
    });

    return successResponse({ stats });
  } catch (error) {
    logger.api.error('Error fetching admin stats', error);
    return internalError();
  }
}

