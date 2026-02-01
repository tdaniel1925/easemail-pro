import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userActivityLogs } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql, or, ilike } from 'drizzle-orm';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/activity-logs
 * Fetch all activity logs across all users with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized activity logs access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access activity logs', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const userId = searchParams.get('userId');
    const activityType = searchParams.get('activityType');
    const activityName = searchParams.get('activityName');
    const status = searchParams.get('status');
    const isFlagged = searchParams.get('isFlagged');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); // Search in activityName, path, errorMessage
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [];

    if (userId) {
      conditions.push(eq(userActivityLogs.userId, userId));
    }

    if (activityType) {
      conditions.push(eq(userActivityLogs.activityType, activityType));
    }

    if (activityName) {
      conditions.push(eq(userActivityLogs.activityName, activityName));
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

    if (search) {
      conditions.push(
        or(
          ilike(userActivityLogs.activityName, `%${search}%`),
          ilike(userActivityLogs.path, `%${search}%`),
          ilike(userActivityLogs.errorMessage, `%${search}%`)
        )
      );
    }

    // Fetch activities with user information
    const activities = await db
      .select({
        id: userActivityLogs.id,
        userId: userActivityLogs.userId,
        userEmail: users.email,
        userFullName: users.fullName,
        activityType: userActivityLogs.activityType,
        activityName: userActivityLogs.activityName,
        path: userActivityLogs.path,
        method: userActivityLogs.method,
        status: userActivityLogs.status,
        errorMessage: userActivityLogs.errorMessage,
        isFlagged: userActivityLogs.isFlagged,
        metadata: userActivityLogs.metadata,
        duration: userActivityLogs.duration,
        ipAddress: userActivityLogs.ipAddress,
        userAgent: userActivityLogs.userAgent,
        browser: userActivityLogs.browser,
        os: userActivityLogs.os,
        device: userActivityLogs.device,
        createdAt: userActivityLogs.createdAt,
      })
      .from(userActivityLogs)
      .leftJoin(users, eq(userActivityLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userActivityLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get summary statistics
    const typeSummary = await db
      .select({
        activityType: userActivityLogs.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivityLogs)
      .groupBy(userActivityLogs.activityType)
      .orderBy(desc(sql<number>`count(*)`))
      .limit(10);

    const statusSummary = await db
      .select({
        status: userActivityLogs.status,
        count: sql<number>`count(*)::int`,
      })
      .from(userActivityLogs)
      .groupBy(userActivityLogs.status);

    const flaggedCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userActivityLogs)
      .where(eq(userActivityLogs.isFlagged, true));

    logger.admin.info('Activity logs fetched', {
      requestedBy: dbUser.email,
      filters: {
        userId,
        activityType,
        status,
        isFlagged,
        startDate,
        endDate,
        search
      },
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
        byStatus: statusSummary,
        flaggedCount: flaggedCount[0]?.count || 0,
      },
    });
  } catch (error: any) {
    logger.api.error('Error fetching activity logs', error);
    return internalError();
  }
}
