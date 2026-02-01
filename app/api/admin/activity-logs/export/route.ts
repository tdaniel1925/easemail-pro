import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userActivityLogs } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, or, ilike } from 'drizzle-orm';
import { unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/activity-logs/export
 * Export activity logs as CSV
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized activity logs export attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to export activity logs', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters (same as main endpoint)
    const userId = searchParams.get('userId');
    const activityType = searchParams.get('activityType');
    const activityName = searchParams.get('activityName');
    const status = searchParams.get('status');
    const isFlagged = searchParams.get('isFlagged');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

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

    // Fetch all matching activities (limit to 10000 for export)
    const activities = await db
      .select({
        id: userActivityLogs.id,
        createdAt: userActivityLogs.createdAt,
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
        duration: userActivityLogs.duration,
        ipAddress: userActivityLogs.ipAddress,
        browser: userActivityLogs.browser,
        os: userActivityLogs.os,
        device: userActivityLogs.device,
      })
      .from(userActivityLogs)
      .leftJoin(users, eq(userActivityLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(10000);

    // Convert to CSV
    const headers = [
      'Timestamp',
      'User Email',
      'User Name',
      'Activity Type',
      'Activity Name',
      'Path',
      'Method',
      'Status',
      'Error Message',
      'Flagged',
      'Duration (ms)',
      'IP Address',
      'Browser',
      'OS',
      'Device',
    ];

    const csvRows = [headers.join(',')];

    for (const activity of activities) {
      const row = [
        activity.createdAt?.toISOString() || '',
        activity.userEmail || '',
        activity.userFullName || '',
        activity.activityType || '',
        activity.activityName || '',
        activity.path || '',
        activity.method || '',
        activity.status || '',
        (activity.errorMessage || '').replace(/"/g, '""'), // Escape quotes
        activity.isFlagged ? 'Yes' : 'No',
        activity.duration?.toString() || '',
        activity.ipAddress || '',
        activity.browser || '',
        activity.os || '',
        activity.device || '',
      ];

      csvRows.push(row.map(value => `"${value}"`).join(','));
    }

    const csv = csvRows.join('\n');

    logger.admin.info('Activity logs exported', {
      exportedBy: dbUser.email,
      recordCount: activities.length,
      filters: { userId, activityType, status, isFlagged, startDate, endDate, search }
    });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString()}.csv"`,
      },
    });
  } catch (error: any) {
    logger.api.error('Error exporting activity logs', error);
    return internalError();
  }
}
