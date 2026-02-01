import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userActivityLogs, emailAccounts } from '@/lib/db/schema';
import { eq, sql, gte, and } from 'drizzle-orm';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/system-health
 * Get system health metrics (Platform Admin Only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized system health access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access system health', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Database Health Check
    const dbStartTime = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      logger.api.error('Database health check failed', error);
    }
    const dbResponseTime = Date.now() - dbStartTime;
    const dbHealthy = dbResponseTime < 1000; // Consider healthy if < 1 second

    // 2. Error Rate (last 24 hours)
    const [{ errorCount, totalCount }] = await db
      .select({
        errorCount: sql<number>`COUNT(*) FILTER (WHERE status = 'error')::int`,
        totalCount: sql<number>`COUNT(*)::int`,
      })
      .from(userActivityLogs)
      .where(gte(userActivityLogs.createdAt, last24Hours));

    const errorRate = totalCount > 0 ? ((errorCount / totalCount) * 100).toFixed(2) : '0.00';
    const errorRateHealthy = parseFloat(errorRate) < 5; // Consider healthy if < 5% errors

    // 3. API Activity (last 24 hours)
    const activityByHour = await db
      .select({
        hour: sql<string>`date_trunc('hour', created_at)::text`,
        count: sql<number>`COUNT(*)::int`,
        avgDuration: sql<number>`AVG(duration)::int`,
        errorCount: sql<number>`COUNT(*) FILTER (WHERE status = 'error')::int`,
      })
      .from(userActivityLogs)
      .where(gte(userActivityLogs.createdAt, last24Hours))
      .groupBy(sql`date_trunc('hour', created_at)`)
      .orderBy(sql`date_trunc('hour', created_at) DESC`)
      .limit(24);

    // 4. Average Response Times
    const [{ avgResponseTime }] = await db
      .select({
        avgResponseTime: sql<number>`COALESCE(AVG(duration), 0)::int`,
      })
      .from(userActivityLogs)
      .where(
        and(
          gte(userActivityLogs.createdAt, last24Hours),
          sql`duration IS NOT NULL`
        )
      );

    const apiPerformanceHealthy = (avgResponseTime || 0) < 500; // Consider healthy if avg < 500ms

    // 5. Top Error Endpoints (last 24 hours)
    const topErrors = await db
      .select({
        path: userActivityLogs.path,
        method: userActivityLogs.method,
        count: sql<number>`COUNT(*)::int`,
        lastError: sql<string>`MAX(error_message)::text`,
      })
      .from(userActivityLogs)
      .where(
        and(
          gte(userActivityLogs.createdAt, last24Hours),
          eq(userActivityLogs.status, 'error')
        )
      )
      .groupBy(userActivityLogs.path, userActivityLogs.method)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    // 6. System Resources (simplified - would need actual system monitoring)
    const [{ activeUsers }] = await db
      .select({
        activeUsers: sql<number>`COUNT(DISTINCT user_id)::int`,
      })
      .from(userActivityLogs)
      .where(gte(userActivityLogs.createdAt, last24Hours));

    const [{ activeAccounts }] = await db
      .select({
        activeAccounts: sql<number>`COUNT(*)::int`,
      })
      .from(emailAccounts)
      .where(eq(emailAccounts.isActive, true));

    // 7. Error Trends (last 7 days)
    const errorTrend = await db
      .select({
        date: sql<string>`date_trunc('day', created_at)::text`,
        errorCount: sql<number>`COUNT(*) FILTER (WHERE status = 'error')::int`,
        totalCount: sql<number>`COUNT(*)::int`,
      })
      .from(userActivityLogs)
      .where(gte(userActivityLogs.createdAt, last7Days))
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at) ASC`);

    // 8. Top Activity Types (last 24 hours)
    const topActivityTypes = await db
      .select({
        activityType: userActivityLogs.activityType,
        count: sql<number>`COUNT(*)::int`,
        avgDuration: sql<number>`AVG(duration)::int`,
      })
      .from(userActivityLogs)
      .where(gte(userActivityLogs.createdAt, last24Hours))
      .groupBy(userActivityLogs.activityType)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    // 9. Flagged Activities (recent critical events)
    const flaggedActivities = await db
      .select({
        id: userActivityLogs.id,
        userId: userActivityLogs.userId,
        activityType: userActivityLogs.activityType,
        activityName: userActivityLogs.activityName,
        status: userActivityLogs.status,
        errorMessage: userActivityLogs.errorMessage,
        createdAt: userActivityLogs.createdAt,
      })
      .from(userActivityLogs)
      .where(
        and(
          eq(userActivityLogs.isFlagged, true),
          gte(userActivityLogs.createdAt, last24Hours)
        )
      )
      .orderBy(sql`${userActivityLogs.createdAt} DESC`)
      .limit(20);

    // Overall system health status
    const overallHealthy = dbHealthy && errorRateHealthy && apiPerformanceHealthy;
    const healthStatus = overallHealthy ? 'healthy' : 'degraded';

    logger.admin.info('System health checked', {
      requestedBy: dbUser.email,
      status: healthStatus,
      dbResponseTime,
      errorRate,
      avgResponseTime
    });

    return successResponse({
      status: healthStatus,
      timestamp: now.toISOString(),
      checks: {
        database: {
          healthy: dbHealthy,
          responseTime: dbResponseTime,
          message: dbHealthy ? 'Database responding normally' : 'Database response time elevated',
        },
        errorRate: {
          healthy: errorRateHealthy,
          rate: parseFloat(errorRate),
          errorCount,
          totalRequests: totalCount,
          message: errorRateHealthy ? 'Error rate within acceptable range' : 'Error rate elevated',
        },
        apiPerformance: {
          healthy: apiPerformanceHealthy,
          avgResponseTime: avgResponseTime || 0,
          message: apiPerformanceHealthy ? 'API performance normal' : 'API performance degraded',
        },
      },
      metrics: {
        activeUsers,
        activeAccounts,
        requestsLast24Hours: totalCount,
        errorsLast24Hours: errorCount,
      },
      activity: {
        byHour: activityByHour.map(a => ({
          hour: a.hour,
          requests: a.count,
          errors: a.errorCount,
          avgDuration: a.avgDuration || 0,
          errorRate: a.count > 0 ? ((a.errorCount / a.count) * 100).toFixed(2) : '0.00',
        })),
        byType: topActivityTypes.map(t => ({
          type: t.activityType,
          count: t.count,
          avgDuration: t.avgDuration || 0,
        })),
      },
      errors: {
        topEndpoints: topErrors.map(e => ({
          path: e.path,
          method: e.method,
          count: e.count,
          lastError: e.lastError,
        })),
        trend: errorTrend.map(t => ({
          date: t.date,
          errors: t.errorCount,
          total: t.totalCount,
          rate: t.totalCount > 0 ? ((t.errorCount / t.totalCount) * 100).toFixed(2) : '0.00',
        })),
      },
      flaggedActivities: flaggedActivities.map(f => ({
        id: f.id,
        userId: f.userId,
        type: f.activityType,
        name: f.activityName,
        status: f.status,
        error: f.errorMessage,
        createdAt: f.createdAt,
      })),
    });
  } catch (error: any) {
    logger.api.error('Error fetching system health', error);
    return internalError();
  }
}
