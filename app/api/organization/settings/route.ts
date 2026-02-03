import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organization/settings
 *
 * Get organization settings
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return unauthorized();
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || !dbUser.organizationId) {
      return forbidden('You must be part of an organization');
    }

    // Only org_admin and platform_admin can view settings
    if (dbUser.role !== 'org_admin' && dbUser.role !== 'platform_admin') {
      return forbidden('Organization admin access required');
    }

    const organization = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, dbUser.organizationId!),
    });

    if (!organization) {
      return internalError('Organization not found');
    }

    return successResponse({ organization });
  } catch (error) {
    logger.api.error('Error fetching organization settings', error);
    return internalError();
  }
}

/**
 * PATCH /api/organization/settings (CSRF Protected)
 *
 * Update organization settings
 */
export const PATCH = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return unauthorized();
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || !dbUser.organizationId) {
      return forbidden('You must be part of an organization');
    }

    // Only org_admin and platform_admin can update settings
    if (dbUser.role !== 'org_admin' && dbUser.role !== 'platform_admin') {
      return forbidden('Organization admin access required');
    }

    const body = await request.json();
    const { name, billingEmail, contactEmail } = body;

    const updates: any = {};
    if (name) updates.name = name;
    if (billingEmail !== undefined) updates.billingEmail = billingEmail;
    if (contactEmail !== undefined) updates.contactEmail = contactEmail;

    if (Object.keys(updates).length === 0) {
      return badRequest('No fields to update');
    }

    const [updatedOrg] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, dbUser.organizationId))
      .returning();

    logger.admin.info('Organization settings updated', {
      organizationId: dbUser.organizationId,
      updatedBy: dbUser.email,
      fields: Object.keys(updates),
    });

    return successResponse({ organization: updatedOrg }, 'Settings updated successfully');
  } catch (error) {
    logger.api.error('Error updating organization settings', error);
    return internalError();
  }
});
