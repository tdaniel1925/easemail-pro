import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, smsUsage, aiUsage, storageUsage, paymentMethods } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized user usage access');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'admin') {
      logger.security.warn('Non-admin attempted to access user usage', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Admin access required');
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

    logger.admin.info('User usage data fetched', {
      requestedBy: dbUser?.email || 'unknown',
      userCount: userUsage.length,
      limit,
      offset,
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });

    // Return using existing NextResponse.json since this has complex nested structure
  } catch (error: any) {
    logger.api.error('Error fetching user usage data', error);
    return internalError();
  }
}

