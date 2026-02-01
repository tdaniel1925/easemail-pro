import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { pricingTiers, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/tiers
 * List all pricing tiers
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing tiers access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access pricing tiers', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const tiers = await db.select().from(pricingTiers).orderBy(pricingTiers.minQuantity);

    logger.admin.info('Pricing tiers fetched', {
      requestedBy: dbUser.email,
      tierCount: tiers.length
    });

    return successResponse({ tiers });
  } catch (error: any) {
    logger.api.error('Error fetching pricing tiers', error);
    return internalError();
  }
}

/**
 * POST /api/admin/pricing/tiers
 * Create new pricing tier (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing tier creation attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to create pricing tier', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { usagePricingId, tierName, minQuantity, maxQuantity, ratePerUnit } = body;

    if (!usagePricingId || minQuantity === undefined || ratePerUnit === undefined) {
      logger.admin.warn('Missing required fields for pricing tier creation', {
        hasUsagePricingId: !!usagePricingId,
        hasMinQuantity: minQuantity !== undefined,
        hasRatePerUnit: ratePerUnit !== undefined,
        requestedBy: dbUser.email
      });
      return badRequest('usagePricingId, minQuantity, and ratePerUnit are required');
    }

    const [newTier] = await db.insert(pricingTiers).values({
      usagePricingId,
      tierName: tierName || null,
      minQuantity,
      maxQuantity: maxQuantity || null,
      ratePerUnit: ratePerUnit.toString(),
    }).returning();

    logger.admin.info('Pricing tier created', {
      tierId: newTier.id,
      usagePricingId,
      tierName,
      minQuantity,
      maxQuantity,
      ratePerUnit,
      createdBy: dbUser.email
    });

    return successResponse({ tier: newTier }, 'Pricing tier created successfully', 201);
  } catch (error: any) {
    logger.api.error('Error creating pricing tier', error);
    return internalError();
  }
});

