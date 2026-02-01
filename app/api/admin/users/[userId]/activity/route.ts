import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userActivityLogs } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * GET /api/admin/users/[userId]/activity
 * Fetch user activity logs with filters
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized user activity access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access user activity', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const activityType = searchParams.get('activityType');
    const status = searchParams.get('status');
    const isFlagged = searchParams.get('isFlagged');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [eq(userActivityLogs.userId, userId)];

    if (activityType) {
      conditions.push(eq(userActivityLogs.activityType, activityType));
    }

    if (status) {
      conditions.push(eq(userActivityLogs.status, status));
    }

    if (isFlagged === 'true') {
      conditions.push(eq(userActivityLogs.isFlagged, true));
    }

    if (startDate) {
      conditions.push(gte(userActivityLogs.createdAt, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(userActivityLogs.createdAt, new Date(endDate)));
    }

    // Fetch activities
    const activities = await db
      .select()
      .from(userActivityLogs)
      .where(and(...conditions))
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userActivityLogs)
      .where(and(...conditions));

    // Get activity type summary
    const typeSummary = await db
      .select({
        activityType: userActivityLogs.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .groupBy(userActivityLogs.activityType);

    // Get error summary
    const errorSummary = await db
      .select({
        status: userActivityLogs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .groupBy(userActivityLogs.status);

    logger.admin.info('User activity logs fetched', {
      requestedBy: dbUser.email,
      userId,
      filters: { activityType, status, isFlagged, startDate, endDate },
      resultCount: activities.length,
      totalCount: count
    });

    return successResponse({
      activities,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + activities.length < count,
      },
      summary: {
        byType: typeSummary,
        byStatus: errorSummary,
      },
    });
  } catch (error: any) {
    logger.api.error('Error fetching user activity logs', error);
    return internalError();
  }
}

/**
 * POST /api/admin/users/[userId]/activity
 * Log a new activity (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized activity log creation attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to create activity log', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { userId } = await context.params;
    const body = await request.json();

    const {
      activityType,
      activityName,
      path,
      method,
      status = 'success',
      errorMessage,
      errorStack,
      metadata,
      duration,
      ipAddress,
      userAgent,
      browser,
      os,
      device,
    } = body;

    if (!activityType || !activityName) {
      logger.admin.warn('Missing required fields for activity log creation', {
        hasActivityType: !!activityType,
        hasActivityName: !!activityName,
        requestedBy: dbUser.email
      });
      return badRequest('activityType and activityName are required');
    }

    // Create activity log
    const [activity] = await db.insert(userActivityLogs).values({
      userId,
      activityType,
      activityName,
      path,
      method,
      status,
      errorMessage,
      errorStack,
      isFlagged: status === 'error', // Auto-flag errors
      metadata,
      duration,
      ipAddress,
      userAgent,
      browser,
      os,
      device,
    }).returning();

    logger.admin.info('Activity log created', {
      activityId: activity.id,
      userId,
      activityType,
      activityName,
      status,
      createdBy: dbUser.email
    });

    return successResponse({ activity }, 'Activity log created successfully', 201);
  } catch (error: any) {
    logger.api.error('Error creating activity log', error);
    return internalError();
  }
});
