import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { retryFailedCharges } from '@/lib/billing/automated-billing';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

/**
 * POST /api/admin/billing/retry (CSRF Protected)
 *
 * Retry failed charges
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized billing retry attempt');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      logger.security.warn('Non-admin attempted to retry failed charges', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Admin access required');
    }

    logger.admin.info('Retry failed charges triggered', {
      triggeredBy: dbUser.email
    });

    // Retry failed charges
    const result = await retryFailedCharges();

    logger.admin.info('Retry process completed', {
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
    }, 'Retry process completed');
  } catch (error: any) {
    logger.api.error('Error retrying failed charges', error);
    return internalError();
  }
});

