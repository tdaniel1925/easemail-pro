import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import {
  users,
  subscriptions,
  sms_usage,
  ai_usage,
  storage_usage,
  emailAccounts,
} from '@/lib/db/schema';
import { eq, gte, lte, sql, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/cost-center
 * Get platform-wide cost metrics (admin only)
 */
export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';

    // Calculate date range
    const now = new Date();
    let periodStart: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    switch (range) {
      case 'week':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(periodStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodEnd = periodStart;
        break;
      case 'quarter':
        periodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(periodStart.getTime() - 90 * 24 * 60 * 60 * 1000);
        previousPeriodEnd = periodStart;
        break;
      case 'year':
        periodStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(periodStart.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousPeriodEnd = periodStart;
        break;
      default: // month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    // Get active subscriptions
    const activeSubscriptions = await db.query.subscriptions.findMany({
      where: eq(subscriptions.status, 'active'),
    });

    // Calculate total revenue (simplified - based on active subscriptions)
    const pricing = {
      individual: { monthly: 45, annual: 36 },
      team: { monthly: 40.5, annual: 32.4 },
    };

    let totalRevenue = 0;
    activeSubscriptions.forEach((sub) => {
      if (sub.planId === 'individual' || sub.planId === 'team') {
        const billingCycle = sub.billingCycle || 'monthly';
        const price = pricing[sub.planId as 'individual' | 'team'][billingCycle as 'monthly' | 'annual'];
        totalRevenue += price * (sub.seats || 1);
      }
    });

    // Get SMS costs
    const smsResult = await db
      .select({
        totalMessages: sql<number>`COALESCE(SUM(${sms_usage.messageCount}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${sms_usage.cost}), 0)`,
      })
      .from(sms_usage)
      .where(gte(sms_usage.createdAt, periodStart));

    const smsData = smsResult[0] || { totalMessages: 0, totalCost: 0 };

    // Get AI costs
    const aiResult = await db
      .select({
        totalRequests: sql<number>`COALESCE(SUM(${ai_usage.requestCount}), 0)`,
        totalCost: sql<number>`COALESCE(SUM(${ai_usage.cost}), 0)`,
      })
      .from(ai_usage)
      .where(gte(ai_usage.createdAt, periodStart));

    const aiData = aiResult[0] || { totalRequests: 0, totalCost: 0 };

    // Get Storage costs
    const storageResult = await db
      .select({
        totalGB: sql<number>`COALESCE(SUM(${storage_usage.storageUsed}), 0) / 1073741824.0`,
        totalCost: sql<number>`COALESCE(SUM(${storage_usage.cost}), 0)`,
      })
      .from(storage_usage)
      .where(gte(storage_usage.createdAt, periodStart));

    const storageData = storageResult[0] || { totalGB: 0, totalCost: 0 };

    // Get Email accounts count (estimate $5/account/month for Nylas)
    const nylasAccounts = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(emailAccounts);

    const nylasCount = Number(nylasAccounts[0]?.count || 0);
    const nylasCost = nylasCount * 5; // $5 per account per month estimate

    // Calculate totals
    const totalCosts =
      Number(smsData.totalCost) +
      Number(aiData.totalCost) +
      Number(storageData.totalCost) +
      nylasCost;

    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    // Get total users
    const totalUsersResult = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users);

    const totalUsers = Number(totalUsersResult[0]?.count || 0);

    // Get previous period data for trends (simplified)
    const prevSmsResult = await db
      .select({
        totalCost: sql<number>`COALESCE(SUM(${sms_usage.cost}), 0)`,
      })
      .from(sms_usage)
      .where(
        and(
          gte(sms_usage.createdAt, previousPeriodStart),
          lte(sms_usage.createdAt, previousPeriodEnd)
        )
      );

    const prevSmsData = prevSmsResult[0] || { totalCost: 0 };
    const prevTotalCosts = Number(prevSmsData.totalCost) * 3; // Rough estimate

    // Calculate trends
    const costGrowth =
      prevTotalCosts > 0
        ? Math.round(((totalCosts - prevTotalCosts) / prevTotalCosts) * 100)
        : 0;

    const revenueGrowth = 5; // Placeholder - would need historical revenue data
    const userGrowth = 10; // Placeholder - would need historical user count

    // Get top spenders
    const topSpendersData = await db
      .select({
        userId: users.id,
        userName: users.fullName,
        userEmail: users.email,
        smsCost: sql<number>`COALESCE(SUM(${sms_usage.cost}), 0)`,
        aiCost: sql<number>`COALESCE(SUM(${ai_usage.cost}), 0)`,
        storageCost: sql<number>`COALESCE(SUM(${storage_usage.cost}), 0)`,
      })
      .from(users)
      .leftJoin(sms_usage, eq(users.id, sms_usage.userId))
      .leftJoin(ai_usage, eq(users.id, ai_usage.userId))
      .leftJoin(storage_usage, eq(users.id, storage_usage.userId))
      .where(gte(sms_usage.createdAt, periodStart))
      .groupBy(users.id, users.fullName, users.email)
      .orderBy(desc(sql`COALESCE(SUM(${sms_usage.cost}), 0) + COALESCE(SUM(${ai_usage.cost}), 0) + COALESCE(SUM(${storage_usage.cost}), 0)`))
      .limit(10);

    const topSpenders = topSpendersData.map((row) => ({
      userId: row.userId,
      userName: row.userName || '',
      userEmail: row.userEmail || '',
      totalCost: Number(row.smsCost) + Number(row.aiCost) + Number(row.storageCost),
      breakdown: {
        sms: Number(row.smsCost),
        ai: Number(row.aiCost),
        storage: Number(row.storageCost),
      },
    }));

    return NextResponse.json({
      success: true,
      metrics: {
        totalRevenue,
        totalCosts,
        netProfit,
        profitMargin,
        activeSubscriptions: activeSubscriptions.length,
        totalUsers,
        costs: {
          sms: {
            totalMessages: Number(smsData.totalMessages),
            totalCost: Number(smsData.totalCost),
            averageCostPerMessage:
              Number(smsData.totalMessages) > 0
                ? Number(smsData.totalCost) / Number(smsData.totalMessages)
                : 0,
          },
          ai: {
            totalRequests: Number(aiData.totalRequests),
            totalCost: Number(aiData.totalCost),
            averageCostPerRequest:
              Number(aiData.totalRequests) > 0
                ? Number(aiData.totalCost) / Number(aiData.totalRequests)
                : 0,
          },
          storage: {
            totalGB: Number(storageData.totalGB),
            totalCost: Number(storageData.totalCost),
            averageCostPerGB:
              Number(storageData.totalGB) > 0
                ? Number(storageData.totalCost) / Number(storageData.totalGB)
                : 0,
          },
          nylas: {
            totalAccounts: nylasCount,
            totalCost: nylasCost,
            averageCostPerAccount: nylasCount > 0 ? nylasCost / nylasCount : 0,
          },
        },
        trends: {
          revenueGrowth,
          costGrowth,
          userGrowth,
        },
      },
      topSpenders,
    });
  } catch (error) {
    console.error('Error fetching cost center data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost center data' },
      { status: 500 }
    );
  }
}
