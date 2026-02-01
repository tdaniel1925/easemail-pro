import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/run-migration
 * Run database migrations (CSRF Protected, Platform Admin Only)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Authentication check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized migration attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to run migration', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    logger.admin.info('Running webhook suppression migration', {
      requestedBy: dbUser.email
    });

    // Add suppress_webhooks column
    await db.execute(sql`
      ALTER TABLE email_accounts
      ADD COLUMN IF NOT EXISTS suppress_webhooks BOOLEAN DEFAULT FALSE
    `);

    logger.admin.info('Added suppress_webhooks column', {
      requestedBy: dbUser.email
    });

    // Add index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_suppress_webhooks
      ON email_accounts(suppress_webhooks)
      WHERE suppress_webhooks = true
    `);

    logger.admin.info('Added suppress_webhooks index', {
      requestedBy: dbUser.email
    });

    // Add comment
    await db.execute(sql`
      COMMENT ON COLUMN email_accounts.suppress_webhooks IS 'Temporary flag to suppress webhook processing during initial sync to prevent race conditions'
    `);

    logger.admin.info('Webhook suppression migration completed', {
      requestedBy: dbUser.email
    });

    return successResponse({}, 'Webhook suppression migration completed');
  } catch (error: any) {
    logger.api.error('Migration failed', error);
    return internalError();
  }
});
