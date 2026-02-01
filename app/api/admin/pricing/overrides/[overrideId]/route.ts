import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { organizationPricingOverrides, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ overrideId: string }>;
};

/**
 * PATCH /api/admin/pricing/overrides/[overrideId]
 * Update organization pricing override (CSRF Protected)
 */
export const PATCH = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing override update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update pricing override', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { overrideId } = await context.params;
    const body = await request.json();
    const {
      planId,
      customMonthlyRate,
      customAnnualRate,
      customSmsRate,
      customAiRate,
      customStorageRate,
      notes
    } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (planId !== undefined) updateData.planId = planId;
    if (customMonthlyRate !== undefined) updateData.customMonthlyRate = customMonthlyRate ? customMonthlyRate.toString() : null;
    if (customAnnualRate !== undefined) updateData.customAnnualRate = customAnnualRate ? customAnnualRate.toString() : null;
    if (customSmsRate !== undefined) updateData.customSmsRate = customSmsRate ? customSmsRate.toString() : null;
    if (customAiRate !== undefined) updateData.customAiRate = customAiRate ? customAiRate.toString() : null;
    if (customStorageRate !== undefined) updateData.customStorageRate = customStorageRate ? customStorageRate.toString() : null;
    if (notes !== undefined) updateData.notes = notes;

    const [updatedOverride] = await db
      .update(organizationPricingOverrides)
      .set(updateData)
      .where(eq(organizationPricingOverrides.id, overrideId))
      .returning();

    if (!updatedOverride) {
      logger.admin.warn('Pricing override not found for update', {
        overrideId,
        requestedBy: dbUser.email
      });
      return notFound('Pricing override not found');
    }

    logger.admin.info('Pricing override updated', {
      overrideId,
      updates: Object.keys(updateData).filter(k => k !== 'updatedAt'),
      updatedBy: dbUser.email
    });

    return successResponse({ override: updatedOverride }, 'Pricing override updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating organization override', error);
    return internalError();
  }
});

/**
 * DELETE /api/admin/pricing/overrides/[overrideId]
 * Delete organization pricing override (CSRF Protected)
 */
export const DELETE = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing override deletion attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to delete pricing override', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { overrideId } = await context.params;

    await db.delete(organizationPricingOverrides).where(eq(organizationPricingOverrides.id, overrideId));

    logger.admin.info('Pricing override deleted', {
      overrideId,
      deletedBy: dbUser.email
    });

    return successResponse({ deleted: true }, 'Pricing override deleted successfully');
  } catch (error: any) {
    logger.api.error('Error deleting organization override', error);
    return internalError();
  }
});

