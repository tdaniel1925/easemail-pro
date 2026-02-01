import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, aiUsage } from '@/lib/db/schema';
import { eq, sql, and, gte, inArray } from 'drizzle-orm';
import { successResponse, unauthorized, forbidden, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

/**
 * GET /api/admin/organizations/[orgId]/ai-usage
 * Fetch organization AI usage statistics
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized organization AI usage access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access organization AI usage', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const { orgId } = await context.params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get organization details
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      logger.admin.warn('Organization not found for AI usage query', {
        orgId,
        requestedBy: dbUser.email
      });
      return notFound('Organization not found');
    }

    // Get all users in this organization
    const orgUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.organizationId, orgId));

    const userIds = orgUsers.map(u => u.id);

    if (userIds.length === 0) {
      logger.admin.info('Organization AI usage fetched (no users)', {
        orgId,
        orgName: org.name,
        requestedBy: dbUser.email,
        periodDays: days
      });

      return successResponse({
        organization: org,
        usage: {
          total: { requests: 0, cost: 0 },
          byFeature: [],
          byDay: [],
          byUser: [],
          topUsers: [],
        },
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      });
    }

    // Fetch total AI usage for the organization
    const totalStats = await db
      .select({
        totalRequests: sql<number>`sum(request_count)::int`,
        totalCost: sql<string>`sum(total_cost_usd)::text`,
      })
      .from(aiUsage)
      .where(and(
        inArray(aiUsage.userId, userIds),
        gte(aiUsage.periodStart, startDate)
      ));

    // Get usage by feature
    const byFeature = await db
      .select({
        feature: aiUsage.feature,
        requests: sql<number>`sum(request_count)::int`,
        cost: sql<string>`sum(total_cost_usd)::text`,
      })
      .from(aiUsage)
      .where(and(
        inArray(aiUsage.userId, userIds),
        gte(aiUsage.periodStart, startDate)
      ))
      .groupBy(aiUsage.feature)
      .orderBy(sql`sum(total_cost_usd) DESC`);

    // Get usage by day
    const byDay = await db
      .select({
        date: sql<string>`date_trunc('day', period_start)::text`,
        requests: sql<number>`sum(request_count)::int`,
        cost: sql<string>`sum(total_cost_usd)::text`,
      })
      .from(aiUsage)
      .where(and(
        inArray(aiUsage.userId, userIds),
        gte(aiUsage.periodStart, startDate)
      ))
      .groupBy(sql`date_trunc('day', period_start)`)
      .orderBy(sql`date_trunc('day', period_start)`);

    // Get usage by user
    const byUser = await db
      .select({
        userId: aiUsage.userId,
        userEmail: users.email,
        userName: users.fullName,
        requests: sql<number>`sum(request_count)::int`,
        cost: sql<string>`sum(total_cost_usd)::text`,
      })
      .from(aiUsage)
      .leftJoin(users, eq(aiUsage.userId, users.id))
      .where(and(
        inArray(aiUsage.userId, userIds),
        gte(aiUsage.periodStart, startDate)
      ))
      .groupBy(aiUsage.userId, users.email, users.fullName)
      .orderBy(sql`sum(total_cost_usd) DESC`);

    // Get top 10 users
    const topUsers = byUser.slice(0, 10);

    logger.admin.info('Organization AI usage fetched', {
      orgId,
      orgName: org.name,
      requestedBy: dbUser.email,
      periodDays: days,
      totalUsers: userIds.length,
      totalRequests: totalStats[0]?.totalRequests || 0
    });

    return successResponse({
      organization: {
        id: org.id,
        name: org.name,
        memberCount: userIds.length,
      },
      usage: {
        total: {
          requests: totalStats[0]?.totalRequests || 0,
          cost: parseFloat(totalStats[0]?.totalCost || '0'),
        },
        byFeature,
        byDay,
        byUser,
        topUsers,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.api.error('Error fetching organization AI usage', error);
    return internalError();
  }
}
