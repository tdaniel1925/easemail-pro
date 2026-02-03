import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizationMembers } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/organization/stats
 *
 * Get organization statistics for the dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization stats access');
      return unauthorized();
    }

    // Get current user details
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || !dbUser.organizationId) {
      logger.security.warn('User has no organization', {
        userId: user.id,
        email: user.email,
      });
      return forbidden('You must be part of an organization');
    }

    // Check if user is org_admin or platform_admin
    if (dbUser.role !== 'org_admin' && dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to access organization stats', {
        userId: user.id,
        email: user.email,
        role: dbUser.role,
      });
      return forbidden('Organization admin access required');
    }

    // Get organization details
    const organization = await db.query.organizations.findFirst({
      where: (orgs, { eq }) => eq(orgs.id, dbUser.organizationId!),
    });

    if (!organization) {
      logger.security.warn('Organization not found', {
        organizationId: dbUser.organizationId,
        userId: user.id,
      });
      return forbidden('Organization not found');
    }

    // Count total members
    const totalMembersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.organizationId, organization.id));

    const totalMembers = Number(totalMembersResult[0]?.count || 0);

    // Count active members (not suspended)
    const activeMembersResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.organizationId, organization.id),
          eq(users.suspended, false)
        )
      );

    const activeMembers = Number(activeMembersResult[0]?.count || 0);

    // Get email activity (placeholder - would need actual email sending logs)
    const emailsSentThisMonth = 0; // TODO: Implement actual email counting

    // Get storage used (placeholder)
    const storageUsed = '0 MB'; // TODO: Implement actual storage calculation

    const stats = {
      totalMembers,
      activeMembers,
      maxSeats: organization.maxSeats || 10,
      planType: organization.planType || 'team',
      emailsSentThisMonth,
      storageUsed,
    };

    logger.admin.info('Organization stats fetched', {
      organizationId: organization.id,
      requestedBy: dbUser.email,
    });

    return successResponse({ stats });
  } catch (error) {
    logger.api.error('Error fetching organization stats', error);
    return internalError();
  }
}
