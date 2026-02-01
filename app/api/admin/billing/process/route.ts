import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { processAutomatedBilling } from '@/lib/billing/automated-billing';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for billing process

/**
 * POST /api/admin/billing/process (CSRF Protected)
 *
 * Manually trigger billing process
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized billing process attempt');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      logger.security.warn('Non-admin attempted to trigger billing process', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Admin access required');
    }

    logger.admin.info('Manual billing process triggered', {
      triggeredBy: dbUser.email
    });

    // Run billing process
    const result = await processAutomatedBilling({ enabled: true });

    logger.admin.info('Billing process completed', {
      triggeredBy: dbUser.email,
      runId: result.runId,
      accountsProcessed: result.accountsProcessed,
      chargesSuccessful: result.chargesSuccessful,
      chargesFailed: result.chargesFailed,
      totalAmountCharged: result.totalAmountCharged
    });

    return successResponse({
      result: {
        runId: result.runId,
        accountsProcessed: result.accountsProcessed,
        chargesSuccessful: result.chargesSuccessful,
        chargesFailed: result.chargesFailed,
        totalAmountCharged: result.totalAmountCharged,
        errors: result.errors,
      }
    }, 'Billing process completed');
  } catch (error: any) {
    logger.api.error('Error processing billing', error);
    return internalError();
  }
});

