import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, smsUsage, aiUsage, storageUsage } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/usage/trends
 * 
 * Returns time-series data for usage trends
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - granularity: 'day' | 'week' | 'month' (default: 'day')
 * - type: 'sms' | 'ai' | 'storage' | 'all' (default: 'all')
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
    const granularity = searchParams.get('granularity') || 'day';
    const type = searchParams.get('type') || 'all';

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // PostgreSQL date truncation
    const truncFunc = granularity === 'month' ? 'month' : granularity === 'week' ? 'week' : 'day';

    const trendsData: any = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
        granularity,
      },
    };

    // SMS trends
    if (type === 'all' || type === 'sms') {
      const smsTrends = await db.select({
        date: sql<string>`DATE_TRUNC('${sql.raw(truncFunc)}', ${smsUsage.periodStart})::text`,
        messages: sql<number>`SUM(${smsUsage.totalMessagesSent})::int`,
        cost: sql<string>`SUM(${smsUsage.totalCostUsd}::decimal)::text`,
      })
        .from(smsUsage)
        .where(
          and(
            gte(smsUsage.periodStart, start),
            lte(smsUsage.periodEnd, end)
          )
        )
        .groupBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${smsUsage.periodStart})`)
        .orderBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${smsUsage.periodStart})`);

      trendsData.sms = smsTrends.map(t => ({
        date: t.date,
        messages: t.messages || 0,
        cost: parseFloat(t.cost || '0'),
      }));
    }

    // AI trends
    if (type === 'all' || type === 'ai') {
      const aiTrends = await db.select({
        date: sql<string>`DATE_TRUNC('${sql.raw(truncFunc)}', ${aiUsage.periodStart})::text`,
        requests: sql<number>`SUM(${aiUsage.requestCount})::int`,
        cost: sql<string>`SUM(${aiUsage.totalCostUsd})::text`,
      })
        .from(aiUsage)
        .where(
          and(
            gte(aiUsage.periodStart, start),
            lte(aiUsage.periodEnd, end)
          )
        )
        .groupBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${aiUsage.periodStart})`)
        .orderBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${aiUsage.periodStart})`);

      trendsData.ai = aiTrends.map(t => ({
        date: t.date,
        requests: t.requests || 0,
        cost: parseFloat(t.cost || '0'),
      }));
    }

    // Storage trends
    if (type === 'all' || type === 'storage') {
      const storageTrends = await db.select({
        date: sql<string>`DATE_TRUNC('${sql.raw(truncFunc)}', ${storageUsage.snapshotDate})::text`,
        bytes: sql<string>`MAX(${storageUsage.totalBytes})::text`,
        cost: sql<string>`SUM(${storageUsage.overageCostUsd})::text`,
      })
        .from(storageUsage)
        .where(
          and(
            gte(storageUsage.snapshotDate, start),
            lte(storageUsage.snapshotDate, end)
          )
        )
        .groupBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${storageUsage.snapshotDate})`)
        .orderBy(sql`DATE_TRUNC('${sql.raw(truncFunc)}', ${storageUsage.snapshotDate})`);

      trendsData.storage = storageTrends.map(t => ({
        date: t.date,
        bytes: parseInt(t.bytes || '0'),
        gb: (parseInt(t.bytes || '0') / (1024 ** 3)).toFixed(2),
        cost: parseFloat(t.cost || '0'),
      }));
    }

    return NextResponse.json({
      success: true,
      trends: trendsData,
    });
  } catch (error: any) {
    console.error('Admin usage trends API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage trends', details: error.message },
      { status: 500 }
    );
  }
}

