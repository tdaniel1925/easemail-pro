import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { pricingPlans, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/plans
 * List all pricing plans
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing plans access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access pricing plans', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const plans = await db.select().from(pricingPlans).orderBy(pricingPlans.name);

    logger.admin.info('Pricing plans fetched', {
      requestedBy: dbUser.email,
      planCount: plans.length
    });

    return successResponse({ plans });
  } catch (error: any) {
    logger.api.error('Error fetching pricing plans', error);
    return internalError();
  }
}

/**
 * POST /api/admin/pricing/plans
 * Create a new pricing plan (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing plan creation attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to create pricing plan', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { name, displayName, description, basePriceMonthly, basePriceAnnual, minSeats, maxSeats } = body;

    if (!name || !displayName || basePriceMonthly === undefined || basePriceAnnual === undefined) {
      logger.admin.warn('Missing required fields for pricing plan creation', {
        hasName: !!name,
        hasDisplayName: !!displayName,
        hasBasePriceMonthly: basePriceMonthly !== undefined,
        hasBasePriceAnnual: basePriceAnnual !== undefined,
        requestedBy: dbUser.email
      });
      return badRequest('name, displayName, basePriceMonthly, and basePriceAnnual are required');
    }

    const [newPlan] = await db.insert(pricingPlans).values({
      name,
      displayName,
      description: description || null,
      basePriceMonthly: basePriceMonthly.toString(),
      basePriceAnnual: basePriceAnnual.toString(),
      minSeats: minSeats || 1,
      maxSeats: maxSeats || null,
      isActive: true,
      updatedAt: new Date(),
    }).returning();

    logger.admin.info('Pricing plan created', {
      planId: newPlan.id,
      planName: name,
      displayName,
      basePriceMonthly,
      basePriceAnnual,
      createdBy: dbUser.email
    });

    return successResponse({ plan: newPlan }, 'Pricing plan created successfully', 201);
  } catch (error: any) {
    logger.api.error('Error creating pricing plan', error);
    return internalError();
  }
});

