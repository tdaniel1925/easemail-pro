import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { organizationPricingOverrides, organizations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/overrides
 * List all organization pricing overrides
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing overrides access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access pricing overrides', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    // Fetch overrides with organization names
    const overrides = await db
      .select({
        id: organizationPricingOverrides.id,
        organizationId: organizationPricingOverrides.organizationId,
        organizationName: organizations.name,
        planId: organizationPricingOverrides.planId,
        customMonthlyRate: organizationPricingOverrides.customMonthlyRate,
        customAnnualRate: organizationPricingOverrides.customAnnualRate,
        customSmsRate: organizationPricingOverrides.customSmsRate,
        customAiRate: organizationPricingOverrides.customAiRate,
        customStorageRate: organizationPricingOverrides.customStorageRate,
        notes: organizationPricingOverrides.notes,
      })
      .from(organizationPricingOverrides)
      .leftJoin(organizations, eq(organizationPricingOverrides.organizationId, organizations.id));

    logger.admin.info('Pricing overrides fetched', {
      requestedBy: dbUser.email,
      overrideCount: overrides.length
    });

    return successResponse({ overrides });
  } catch (error: any) {
    logger.api.error('Error fetching organization overrides', error);
    return internalError();
  }
}

/**
 * POST /api/admin/pricing/overrides
 * Create new organization pricing override (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized pricing override creation attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to create pricing override', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const {
      organizationId,
      planId,
      customMonthlyRate,
      customAnnualRate,
      customSmsRate,
      customAiRate,
      customStorageRate,
      notes
    } = body;

    if (!organizationId) {
      logger.admin.warn('Missing organizationId for pricing override creation', {
        requestedBy: dbUser.email
      });
      return badRequest('organizationId is required');
    }

    const [newOverride] = await db.insert(organizationPricingOverrides).values({
      organizationId,
      planId: planId || null,
      customMonthlyRate: customMonthlyRate ? customMonthlyRate.toString() : null,
      customAnnualRate: customAnnualRate ? customAnnualRate.toString() : null,
      customSmsRate: customSmsRate ? customSmsRate.toString() : null,
      customAiRate: customAiRate ? customAiRate.toString() : null,
      customStorageRate: customStorageRate ? customStorageRate.toString() : null,
      notes: notes || null,
      updatedAt: new Date(),
    }).returning();

    logger.admin.info('Pricing override created', {
      overrideId: newOverride.id,
      organizationId,
      planId,
      createdBy: dbUser.email
    });

    return successResponse({ override: newOverride }, 'Pricing override created successfully', 201);
  } catch (error: any) {
    logger.api.error('Error creating organization override', error);
    return internalError();
  }
});

