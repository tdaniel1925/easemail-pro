/**
 * User Billing Usage API
 * 
 * Provides usage and cost data for the authenticated user
 * GET /api/user/billing/usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { costEntries, users } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodStart = searchParams.get('periodStart');
    const periodEnd = searchParams.get('periodEnd');

    // Default to current month
    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startDate = periodStart ? new Date(periodStart) : defaultStart;
    const endDate = periodEnd ? new Date(periodEnd) : defaultEnd;

    // Fetch cost entries
    const conditions = [
      eq(costEntries.userId, user.id),
      gte(costEntries.occurredAt, startDate),
      lte(costEntries.occurredAt, endDate),
    ];

    const costs = await db
      .select()
      .from(costEntries)
      .where(and(...conditions))
      .orderBy(desc(costEntries.occurredAt))
      .limit(500);

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

    // Daily breakdown
    const dailyBreakdown = costs.reduce((acc, c) => {
      const date = new Date(c.occurredAt!).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += parseFloat(c.costUsd || '0');
      return acc;
    }, {} as Record<string, number>);

    // Check if user is in an organization (costs might be billed to org)
    const billedToOrg = !!dbUser.organizationId;

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
        billedToOrganization: billedToOrg,
      },
      byService,
      byFeature,
      dailyBreakdown,
      recentTransactions: costs.slice(0, 50).map(c => ({
        id: c.id,
        service: c.service,
        feature: c.feature,
        cost: parseFloat(c.costUsd || '0'),
        quantity: c.quantity,
        unit: c.unit,
        occurredAt: c.occurredAt,
        metadata: c.metadata,
      })),
    });
  } catch (error: any) {
    console.error('[User] Billing usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data', details: error.message },
      { status: 500 }
    );
  }
}

