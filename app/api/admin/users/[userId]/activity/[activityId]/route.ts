import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userActivityLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ userId: string; activityId: string }>;
};

/**
 * PATCH /api/admin/users/[userId]/activity/[activityId]
 * Update activity log (mainly for flagging/unflagging) (CSRF Protected)
 */
export const PATCH = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized activity log update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update activity log', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { userId, activityId } = await context.params;
    const body = await request.json();

    const { isFlagged } = body;

    // Update activity log
    const [updated] = await db
      .update(userActivityLogs)
      .set({ isFlagged })
      .where(
        and(
          eq(userActivityLogs.id, activityId),
          eq(userActivityLogs.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      logger.admin.warn('Activity log not found for update', {
        activityId,
        userId,
        requestedBy: dbUser.email
      });
      return notFound('Activity log not found');
    }

    logger.admin.info('Activity log updated', {
      activityId,
      userId,
      isFlagged,
      updatedBy: dbUser.email
    });

    return successResponse({ activity: updated }, 'Activity log updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating activity log', error);
    return internalError();
  }
});
