/**
 * Admin Billing Expenses API
 * 
 * Provides comprehensive expense analytics for admins
 * GET /api/admin/billing/expenses
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { costEntries, users, organizations } from '@/lib/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');
    const service = searchParams.get('service');
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');

    // Default to current month if no period specified
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startDate = periodStart ? new Date(periodStart) : defaultStart;
    const endDate = periodEnd ? new Date(periodEnd) : defaultEnd;

    // Build query conditions
    const conditions = [
      gte(costEntries.occurredAt, startDate),
      lte(costEntries.occurredAt, endDate),
    ];

    if (service) {
      conditions.push(eq(costEntries.service, service));
    }
    if (userId) {
      conditions.push(eq(costEntries.userId, userId));
    }
    if (organizationId) {
      conditions.push(eq(costEntries.organizationId, organizationId));
    }

    // Fetch cost entries
    const costs = await db
      .select()
      .from(costEntries)
      .where(and(...conditions))
      .orderBy(desc(costEntries.occurredAt))
      .limit(1000);

    // Calculate aggregations
    const totalCost = costs.reduce((sum, c) => sum + parseFloat(c.costUsd || '0'), 0);
    
    const byService = costs.reduce((acc, c) => {
      const service = c.service;
      if (!acc[service]) {
        acc[service] = { count: 0, cost: 0 };
      }
      acc[service].count += 1;
      acc[service].cost += parseFloat(c.costUsd || '0');
      return acc;
    }, {} as Record<string, { count: number; cost: number }>);

    const byFeature = costs.reduce((acc, c) => {
      const feature = c.feature || 'unknown';
      if (!acc[feature]) {
        acc[feature] = { count: 0, cost: 0 };
      }
      acc[feature].count += 1;
      acc[feature].cost += parseFloat(c.costUsd || '0');
      return acc;
    }, {} as Record<string, { count: number; cost: number }>);

    // Top spenders (users)
    const topUsers = costs
      .filter(c => c.userId)
      .reduce((acc, c) => {
        const userId = c.userId!;
        if (!acc[userId]) {
          acc[userId] = 0;
        }
        acc[userId] += parseFloat(c.costUsd || '0');
        return acc;
      }, {} as Record<string, number>);

    const topUsersList = Object.entries(topUsers)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, cost]) => ({ userId, cost }));

    // Top spending organizations
    const topOrgs = costs
      .filter(c => c.organizationId)
      .reduce((acc, c) => {
        const orgId = c.organizationId!;
        if (!acc[orgId]) {
          acc[orgId] = 0;
        }
        acc[orgId] += parseFloat(c.costUsd || '0');
        return acc;
      }, {} as Record<string, number>);

    const topOrgsList = Object.entries(topOrgs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([organizationId, cost]) => ({ organizationId, cost }));

    // Daily breakdown
    const dailyBreakdown = costs.reduce((acc, c) => {
      const date = new Date(c.occurredAt!).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parseFloat(c.costUsd || '0');
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalCost,
        totalTransactions: costs.length,
        averageCostPerTransaction: costs.length > 0 ? totalCost / costs.length : 0,
      },
      byService,
      byFeature,
      topUsers: topUsersList,
      topOrganizations: topOrgsList,
      dailyBreakdown,
      recentTransactions: costs.slice(0, 20).map(c => ({
        id: c.id,
        service: c.service,
        feature: c.feature,
        cost: parseFloat(c.costUsd || '0'),
        quantity: c.quantity,
        unit: c.unit,
        userId: c.userId,
        organizationId: c.organizationId,
        occurredAt: c.occurredAt,
        metadata: c.metadata,
      })),
    });
  } catch (error: any) {
    console.error('[Admin] Expenses API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses', details: error.message },
      { status: 500 }
    );
  }
}

