import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, aiUsage } from '@/lib/db/schema';
import { eq, sql, and, gte, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET: Fetch organization AI usage statistics
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    const { orgId } = params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get organization details
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all users in this organization
    const orgUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.organizationId, orgId));

    const userIds = orgUsers.map(u => u.id);

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        organization: org,
        usage: {
          total: { requests: 0, tokens: 0, cost: 0 },
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
        totalRequests: sql<number>`count(*)::int`,
        totalTokens: sql<number>`sum(tokens_used)::int`,
        totalCost: sql<string>`sum(cost_usd)::text`,
      })
      .from(aiUsage)
      .where(and(
        inArray(aiUsage.userId, userIds),
        gte(aiUsage.createdAt, startDate)
      ));

    // Get usage by feature
    const byFeature = await db
      .select({
        feature: aiUsage.featureUsed,
        requests: sql<number>`count(*)::int`,
        tokens: sql<number>`sum(tokens_used)::int`,
        cost: sql<string>`sum(cost_usd)::text`,
      })
      .from(aiUsage)
      .where(and(
        inArray(aiUsage.userId, userIds),
        gte(aiUsage.createdAt, startDate)
      ))
      .groupBy(aiUsage.featureUsed)
      .orderBy(sql`sum(cost_usd) DESC`);

    // Get usage by day
    const byDay = await db
      .select({
        date: sql<string>`date_trunc('day', created_at)::text`,
        requests: sql<number>`count(*)::int`,
        tokens: sql<number>`sum(tokens_used)::int`,
        cost: sql<string>`sum(cost_usd)::text`,
      })
      .from(aiUsage)
      .where(and(
        inArray(aiUsage.userId, userIds),
        gte(aiUsage.createdAt, startDate)
      ))
      .groupBy(sql`date_trunc('day', created_at)`)
      .orderBy(sql`date_trunc('day', created_at)`);

    // Get usage by user
    const byUser = await db
      .select({
        userId: aiUsage.userId,
        userEmail: users.email,
        userName: users.fullName,
        requests: sql<number>`count(*)::int`,
        tokens: sql<number>`sum(${aiUsage.tokensUsed})::int`,
        cost: sql<string>`sum(${aiUsage.costUsd})::text`,
      })
      .from(aiUsage)
      .leftJoin(users, eq(aiUsage.userId, users.id))
      .where(and(
        inArray(aiUsage.userId, userIds),
        gte(aiUsage.createdAt, startDate)
      ))
      .groupBy(aiUsage.userId, users.email, users.fullName)
      .orderBy(sql`sum(${aiUsage.costUsd}) DESC`);

    // Get top 10 users
    const topUsers = byUser.slice(0, 10);

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        memberCount: userIds.length,
      },
      usage: {
        total: {
          requests: totalStats[0]?.totalRequests || 0,
          tokens: totalStats[0]?.totalTokens || 0,
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
  } catch (error) {
    console.error('Organization AI usage fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch organization AI usage' }, { status: 500 });
  }
}
