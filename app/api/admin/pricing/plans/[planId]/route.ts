import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { pricingPlans, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ planId: string }>;
};

/**
 * PATCH /api/admin/pricing/plans/[planId]
 * Update a pricing plan (CSRF Protected)
 */
export const PATCH = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing plan update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update pricing plan', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { planId } = await context.params;
    const body = await request.json();
    const { displayName, description, basePriceMonthly, basePriceAnnual, minSeats, maxSeats, isActive } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (basePriceMonthly !== undefined) updateData.basePriceMonthly = basePriceMonthly.toString();
    if (basePriceAnnual !== undefined) updateData.basePriceAnnual = basePriceAnnual.toString();
    if (minSeats !== undefined) updateData.minSeats = minSeats;
    if (maxSeats !== undefined) updateData.maxSeats = maxSeats;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedPlan] = await db
      .update(pricingPlans)
      .set(updateData)
      .where(eq(pricingPlans.id, planId))
      .returning();

    if (!updatedPlan) {
      logger.admin.warn('Pricing plan not found for update', {
        planId,
        requestedBy: dbUser.email
      });
      return notFound('Pricing plan not found');
    }

    logger.admin.info('Pricing plan updated', {
      planId,
      updates: Object.keys(updateData).filter(k => k !== 'updatedAt'),
      updatedBy: dbUser.email
    });

    return successResponse({ plan: updatedPlan }, 'Pricing plan updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating pricing plan', error);
    return internalError();
  }
});

/**
 * DELETE /api/admin/pricing/plans/[planId]
 * Delete a pricing plan (CSRF Protected)
 */
export const DELETE = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing plan deletion attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to delete pricing plan', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { planId } = await context.params;

    await db.delete(pricingPlans).where(eq(pricingPlans.id, planId));

    logger.admin.info('Pricing plan deleted', {
      planId,
      deletedBy: dbUser.email
    });

    return successResponse({ deleted: true }, 'Pricing plan deleted successfully');
  } catch (error: any) {
    logger.api.error('Error deleting pricing plan', error);
    return internalError();
  }
});

