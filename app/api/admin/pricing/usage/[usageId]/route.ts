import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { usagePricing, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ usageId: string }>;
};

/**
 * PATCH /api/admin/pricing/usage/[usageId]
 * Update usage pricing (CSRF Protected)
 */
export const PATCH = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized usage pricing update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update usage pricing', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { usageId } = await context.params;
    const body = await request.json();
    const { pricingModel, baseRate, unit, description, isActive } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (pricingModel !== undefined) updateData.pricingModel = pricingModel;
    if (baseRate !== undefined) updateData.baseRate = baseRate.toString();
    if (unit !== undefined) updateData.unit = unit;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedUsage] = await db
      .update(usagePricing)
      .set(updateData)
      .where(eq(usagePricing.id, usageId))
      .returning();

    if (!updatedUsage) {
      logger.admin.warn('Usage pricing not found for update', {
        usageId,
        requestedBy: dbUser.email
      });
      return notFound('Usage pricing not found');
    }

    logger.admin.info('Usage pricing updated', {
      usageId,
      updates: Object.keys(updateData).filter(k => k !== 'updatedAt'),
      updatedBy: dbUser.email
    });

    return successResponse({ usage: updatedUsage }, 'Usage pricing updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating usage pricing', error);
    return internalError();
  }
});

/**
 * DELETE /api/admin/pricing/usage/[usageId]
 * Delete usage pricing (CSRF Protected)
 */
export const DELETE = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized usage pricing deletion attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to delete usage pricing', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { usageId } = await context.params;

    await db.delete(usagePricing).where(eq(usagePricing.id, usageId));

    logger.admin.info('Usage pricing deleted', {
      usageId,
      deletedBy: dbUser.email
    });

    return successResponse({ deleted: true }, 'Usage pricing deleted successfully');
  } catch (error: any) {
    logger.api.error('Error deleting usage pricing', error);
    return internalError();
  }
});

