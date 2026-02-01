import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { pricingTiers, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ tierId: string }>;
};

/**
 * PATCH /api/admin/pricing/tiers/[tierId]
 * Update pricing tier (CSRF Protected)
 */
export const PATCH = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing tier update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update pricing tier', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { tierId } = await context.params;
    const body = await request.json();
    const { tierName, minQuantity, maxQuantity, ratePerUnit } = body;

    const updateData: any = {};

    if (tierName !== undefined) updateData.tierName = tierName;
    if (minQuantity !== undefined) updateData.minQuantity = minQuantity;
    if (maxQuantity !== undefined) updateData.maxQuantity = maxQuantity;
    if (ratePerUnit !== undefined) updateData.ratePerUnit = ratePerUnit.toString();

    const [updatedTier] = await db
      .update(pricingTiers)
      .set(updateData)
      .where(eq(pricingTiers.id, tierId))
      .returning();

    if (!updatedTier) {
      logger.admin.warn('Pricing tier not found for update', {
        tierId,
        requestedBy: dbUser.email
      });
      return notFound('Pricing tier not found');
    }

    logger.admin.info('Pricing tier updated', {
      tierId,
      updates: Object.keys(updateData),
      updatedBy: dbUser.email
    });

    return successResponse({ tier: updatedTier }, 'Pricing tier updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating pricing tier', error);
    return internalError();
  }
});

/**
 * DELETE /api/admin/pricing/tiers/[tierId]
 * Delete pricing tier (CSRF Protected)
 */
export const DELETE = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing tier deletion attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to delete pricing tier', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { tierId } = await context.params;

    await db.delete(pricingTiers).where(eq(pricingTiers.id, tierId));

    logger.admin.info('Pricing tier deleted', {
      tierId,
      deletedBy: dbUser.email
    });

    return successResponse({ deleted: true }, 'Pricing tier deleted successfully');
  } catch (error: any) {
    logger.api.error('Error deleting pricing tier', error);
    return internalError();
  }
});

