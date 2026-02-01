import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizationMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

/**
 * GET /api/admin/organizations/[orgId]/members
 * Fetch organization members
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization members access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access organization members', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    // Fetch organization members with user details
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, orgId),
      with: {
        member: {
          columns: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    logger.admin.info('Organization members fetched', {
      orgId,
      requestedBy: dbUser.email,
      memberCount: members.length
    });

    return successResponse({ members });
  } catch (error: any) {
    logger.api.error('Error fetching organization members', error);
    return internalError();
  }
}

