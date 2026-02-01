import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { usagePricing, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/usage
 * List all usage pricing
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized usage pricing access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access usage pricing', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const usage = await db.select().from(usagePricing).orderBy(usagePricing.serviceType);

    logger.admin.info('Usage pricing fetched', {
      requestedBy: dbUser.email,
      usageCount: usage.length
    });

    return successResponse({ usage });
  } catch (error: any) {
    logger.api.error('Error fetching usage pricing', error);
    return internalError();
  }
}

/**
 * POST /api/admin/pricing/usage
 * Create new usage pricing (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized usage pricing creation attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to create usage pricing', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { serviceType, pricingModel, baseRate, unit, description } = body;

    if (!serviceType || !pricingModel || baseRate === undefined || !unit) {
      logger.admin.warn('Missing required fields for usage pricing creation', {
        hasServiceType: !!serviceType,
        hasPricingModel: !!pricingModel,
        hasBaseRate: baseRate !== undefined,
        hasUnit: !!unit,
        requestedBy: dbUser.email
      });
      return badRequest('serviceType, pricingModel, baseRate, and unit are required');
    }

    const [newUsage] = await db.insert(usagePricing).values({
      serviceType,
      pricingModel,
      baseRate: baseRate.toString(),
      unit,
      description: description || null,
      isActive: true,
      updatedAt: new Date(),
    }).returning();

    logger.admin.info('Usage pricing created', {
      usageId: newUsage.id,
      serviceType,
      pricingModel,
      baseRate,
      unit,
      createdBy: dbUser.email
    });

    return successResponse({ usage: newUsage }, 'Usage pricing created successfully', 201);
  } catch (error: any) {
    logger.api.error('Error creating usage pricing', error);
    return internalError();
  }
});

