import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, smsUsage, aiUsage, storageUsage, paymentMethods } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/usage/users
 * 
 * Returns per-user usage breakdown
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Default to current month
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Get all users with their usage
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isPromoUser: users.isPromoUser,
      subscriptionTier: users.subscriptionTier,
      organizationId: users.organizationId,
    })
      .from(users)
      .limit(limit)
      .offset(offset);

    const userUsage = await Promise.all(
      allUsers.map(async (u) => {
        // SMS usage
        const smsData = await db.select({
          totalMessages: sql<number>`SUM(${smsUsage.totalMessagesSent})::int`,
          totalCost: sql<string>`SUM(${smsUsage.totalCostUsd}::decimal)::text`,
        })
          .from(smsUsage)
          .where(
            and(
              eq(smsUsage.userId, u.id),
              gte(smsUsage.periodStart, start),
              lte(smsUsage.periodEnd, end)
            )
          );

        // AI usage
        const aiData = await db.select({
          totalRequests: sql<number>`SUM(${aiUsage.requestCount})::int`,
          totalCost: sql<string>`SUM(${aiUsage.totalCostUsd})::text`,
        })
          .from(aiUsage)
          .where(
            and(
              eq(aiUsage.userId, u.id),
              gte(aiUsage.periodStart, start),
              lte(aiUsage.periodEnd, end)
            )
          );

        // Storage usage
        const storageData = await db.select({
          totalBytes: sql<string>`MAX(${storageUsage.totalBytes})::text`,
          overageCost: sql<string>`SUM(${storageUsage.overageCostUsd})::text`,
        })
          .from(storageUsage)
          .where(
            and(
              eq(storageUsage.userId, u.id),
              gte(storageUsage.periodStart, start),
              lte(storageUsage.periodEnd, end)
            )
          );

        // Payment methods
        const paymentMethodsCount = await db.select({
          count: sql<number>`COUNT(*)::int`,
        })
          .from(paymentMethods)
          .where(
            and(
              eq(paymentMethods.userId, u.id),
              eq(paymentMethods.status, 'active')
            )
          );

        const smsCost = parseFloat(smsData[0]?.totalCost || '0');
        const aiCost = parseFloat(aiData[0]?.totalCost || '0');
        const storageCost = parseFloat(storageData[0]?.overageCost || '0');

        return {
          user: {
            id: u.id,
            email: u.email,
            fullName: u.fullName,
            role: u.role,
            isPromoUser: u.isPromoUser,
            subscriptionTier: u.subscriptionTier,
            organizationId: u.organizationId,
          },
          usage: {
            sms: {
              messages: smsData[0]?.totalMessages || 0,
              cost: smsCost,
            },
            ai: {
              requests: aiData[0]?.totalRequests || 0,
              cost: aiCost,
            },
            storage: {
              bytes: parseInt(storageData[0]?.totalBytes || '0'),
              gb: (parseInt(storageData[0]?.totalBytes || '0') / (1024 ** 3)).toFixed(2),
              cost: storageCost,
            },
            total: {
              cost: smsCost + aiCost + storageCost,
            },
          },
          billing: {
            hasPaymentMethod: (paymentMethodsCount[0]?.count || 0) > 0,
            requiresPaymentMethod: !u.isPromoUser && u.subscriptionTier !== 'free',
          },
        };
      })
    );

    // Get total count
    const totalCount = await db.select({
      count: sql<number>`COUNT(*)::int`,
    }).from(users);

    return NextResponse.json({
      success: true,
      users: userUsage,
      pagination: {
        limit,
        offset,
        total: totalCount[0]?.count || 0,
      },
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Admin user usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user usage data', details: error.message },
      { status: 500 }
    );
  }
}

