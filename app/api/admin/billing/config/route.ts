import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import {
  billingConfig as billingConfigSchema
} from '@/lib/db/schema';
import {
  getBillingConfig,
  updateBillingConfig,
  BillingConfig
} from '@/lib/billing/automated-billing';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/billing/config
 * 
 * Get current billing configuration
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized billing config access');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      logger.security.warn('Non-admin attempted to access billing config', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Admin access required');
    }

    const config = await getBillingConfig();

    logger.admin.info('Billing config fetched', {
      requestedBy: dbUser.email,
      enabled: config?.enabled ?? false
    });

    return successResponse({
      config: config || {
        enabled: false,
        frequency: 'monthly',
        dayOfMonth: 1,
        hourOfDay: 2,
        autoRetry: true,
        maxRetries: 3,
        retryDelayHours: 24,
        notifyOnSuccess: false,
        notifyOnFailure: true,
        smsChargeThresholdUsd: 1.00,
        aiChargeThresholdUsd: 5.00,
        minimumChargeUsd: 0.50,
        gracePeriodDays: 3,
      }
    });
  } catch (error: any) {
    logger.api.error('Error fetching billing config', error);
    return internalError();
  }
}

/**
 * PUT /api/admin/billing/config (CSRF Protected)
 *
 * Update billing configuration
 */
export const PUT = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized billing config update attempt');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      logger.security.warn('Non-admin attempted to update billing config', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Admin access required');
    }

    const body = await request.json();

    // Validate required fields
    const config: Partial<BillingConfig> = {
      enabled: body.enabled,
      frequency: body.frequency,
      dayOfWeek: body.dayOfWeek,
      dayOfMonth: body.dayOfMonth,
      hourOfDay: body.hourOfDay,
      autoRetry: body.autoRetry,
      maxRetries: body.maxRetries,
      retryDelayHours: body.retryDelayHours,
      notifyOnSuccess: body.notifyOnSuccess,
      notifyOnFailure: body.notifyOnFailure,
      notificationEmail: body.notificationEmail,
      smsChargeThresholdUsd: body.smsChargeThresholdUsd,
      aiChargeThresholdUsd: body.aiChargeThresholdUsd,
      minimumChargeUsd: body.minimumChargeUsd,
      gracePeriodDays: body.gracePeriodDays,
    };

    await updateBillingConfig(config);

    logger.admin.info('Billing config updated', {
      updatedBy: dbUser.email,
      enabled: config.enabled,
      frequency: config.frequency
    });

    return successResponse({
      config
    }, 'Billing configuration updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating billing config', error);
    return internalError();
  }
});

