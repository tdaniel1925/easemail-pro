import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

// NOTE: This route lacks authentication - should require admin auth before production use
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    logger.admin.info('Running webhook suppression migration');

    // Add suppress_webhooks column
    await db.execute(sql`
      ALTER TABLE email_accounts
      ADD COLUMN IF NOT EXISTS suppress_webhooks BOOLEAN DEFAULT FALSE
    `);

    console.log('✅ Added suppress_webhooks column');

    // Add index
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_accounts_suppress_webhooks
      ON email_accounts(suppress_webhooks)
      WHERE suppress_webhooks = true
    `);

    console.log('✅ Added index');

    // Add comment
    await db.execute(sql`
      COMMENT ON COLUMN email_accounts.suppress_webhooks IS 'Temporary flag to suppress webhook processing during initial sync to prevent race conditions'
    `);

    logger.admin.info('Webhook suppression migration completed');

    return successResponse({}, 'Webhook suppression migration completed');
  } catch (error: any) {
    logger.api.error('Migration failed', error);
    return internalError();
  }
});
