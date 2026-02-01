import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

// PATCH: Update organization (CSRF Protected)
export const PATCH = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { orgId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to update organization', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
        orgId
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { name, planType, billingEmail, maxSeats, isActive } = body;

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (planType !== undefined) updateData.planType = planType;
    if (billingEmail !== undefined) updateData.billingEmail = billingEmail;
    if (maxSeats !== undefined) updateData.maxSeats = maxSeats;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update organization
    await db.update(organizations)
      .set(updateData)
      .where(eq(organizations.id, orgId));

    logger.admin.info('Organization updated', {
      organizationId: orgId,
      updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt'),
      updatedBy: dbUser.email
    });

    return successResponse({ updated: true }, 'Organization updated successfully');
  } catch (error) {
    logger.api.error('Organization update error', error);
    return internalError();
  }
});

// DELETE: Delete organization (CSRF Protected)
export const DELETE = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { orgId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization deletion attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to delete organization', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
        orgId
      });
      return forbidden('Platform admin access required');
    }

    // Get organization info before deletion (for logging)
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      logger.admin.warn('Organization not found for deletion', {
        orgId,
        requestedBy: dbUser.email
      });
      return badRequest('Organization not found');
    }

    // Check if organization has members (use direct select to avoid relation issues)
    const memberCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));

    const memberCount = Number(memberCountResult[0]?.count || 0);

    if (memberCount > 0) {
      logger.admin.warn('Attempted to delete organization with members', {
        orgId,
        organizationName: org.name,
        memberCount,
        requestedBy: dbUser.email
      });
      return badRequest(`Cannot delete organization with ${memberCount} member(s). Remove all members first.`);
    }

    // Delete organization (cascading deletes will handle related records)
    await db.delete(organizations).where(eq(organizations.id, orgId));

    logger.security.info('Organization deleted', {
      organizationId: orgId,
      organizationName: org.name,
      deletedBy: dbUser.email
    });

    return successResponse({ deleted: true }, 'Organization deleted successfully');
  } catch (error) {
    logger.api.error('Organization delete error', error);
    return internalError();
  }
});

