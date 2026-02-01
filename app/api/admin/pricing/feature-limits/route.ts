import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { planFeatureLimits, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/feature-limits
 * Get feature limits (optionally by planId)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized feature limits access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access feature limits', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    let limits;
    if (planId) {
      limits = await db
        .select()
        .from(planFeatureLimits)
        .where(eq(planFeatureLimits.planId, planId));
    } else {
      limits = await db.select().from(planFeatureLimits);
    }

    logger.admin.info('Feature limits fetched', {
      requestedBy: dbUser.email,
      planId: planId || 'all',
      limitCount: limits.length
    });

    return successResponse({ limits });
  } catch (error: any) {
    logger.api.error('Error fetching feature limits', error);
    return internalError();
  }
}

/**
 * POST /api/admin/pricing/feature-limits
 * Create feature limit (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized feature limit creation attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to create feature limit', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { planId, featureKey, limitValue, description } = body;

    if (!planId || !featureKey || limitValue === undefined) {
      logger.admin.warn('Missing required fields for feature limit creation', {
        hasPlanId: !!planId,
        hasFeatureKey: !!featureKey,
        hasLimitValue: limitValue !== undefined,
        requestedBy: dbUser.email
      });
      return badRequest('planId, featureKey, and limitValue are required');
    }

    const [newLimit] = await db.insert(planFeatureLimits).values({
      planId,
      featureKey,
      limitValue,
      description: description || null,
    }).returning();

    logger.admin.info('Feature limit created', {
      limitId: newLimit.id,
      planId,
      featureKey,
      limitValue,
      createdBy: dbUser.email
    });

    return successResponse({ limit: newLimit }, 'Feature limit created successfully', 201);
  } catch (error: any) {
    logger.api.error('Error creating feature limit', error);
    return internalError();
  }
});

/**
 * PATCH /api/admin/pricing/feature-limits
 * Update feature limit (CSRF Protected)
 * Note: limitId passed as query param
 */
export const PATCH = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized feature limit update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update feature limit', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { searchParams } = new URL(request.url);
    const limitId = searchParams.get('limitId');

    if (!limitId) {
      logger.admin.warn('Missing limitId for feature limit update', {
        requestedBy: dbUser.email
      });
      return badRequest('limitId query parameter is required');
    }

    const body = await request.json();
    const { limitValue, description } = body;

    const updateData: any = {};
    if (limitValue !== undefined) updateData.limitValue = limitValue;
    if (description !== undefined) updateData.description = description;

    const [updatedLimit] = await db
      .update(planFeatureLimits)
      .set(updateData)
      .where(eq(planFeatureLimits.id, limitId))
      .returning();

    if (!updatedLimit) {
      logger.admin.warn('Feature limit not found for update', {
        limitId,
        requestedBy: dbUser.email
      });
      return notFound('Feature limit not found');
    }

    logger.admin.info('Feature limit updated', {
      limitId,
      updates: Object.keys(updateData),
      updatedBy: dbUser.email
    });

    return successResponse({ limit: updatedLimit }, 'Feature limit updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating feature limit', error);
    return internalError();
  }
});

/**
 * DELETE /api/admin/pricing/feature-limits
 * Delete feature limit (CSRF Protected)
 * Note: limitId passed as query param
 */
export const DELETE = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized feature limit deletion attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to delete feature limit', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { searchParams } = new URL(request.url);
    const limitId = searchParams.get('limitId');

    if (!limitId) {
      logger.admin.warn('Missing limitId for feature limit deletion', {
        requestedBy: dbUser.email
      });
      return badRequest('limitId query parameter is required');
    }

    await db.delete(planFeatureLimits).where(eq(planFeatureLimits.id, limitId));

    logger.admin.info('Feature limit deleted', {
      limitId,
      deletedBy: dbUser.email
    });

    return successResponse({ deleted: true }, 'Feature limit deleted successfully');
  } catch (error: any) {
    logger.api.error('Error deleting feature limit', error);
    return internalError();
  }
});

