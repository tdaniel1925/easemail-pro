import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, smsUsage, aiUsage, storageUsage } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/usage
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - userId: optional UUID
 * - organizationId: optional UUID
 * - type: optional 'sms' | 'ai' | 'storage' | 'all' (default: 'all')
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
    const userId = searchParams.get('userId');
    const organizationId = searchParams.get('organizationId');
    const type = searchParams.get('type') || 'all';

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    const usageData: any = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    };

    // Fetch SMS usage
    if (type === 'all' || type === 'sms') {
      const smsConditions = [
        gte(smsUsage.periodStart, start),
        lte(smsUsage.periodEnd, end),
      ];

      if (userId) smsConditions.push(eq(smsUsage.userId, userId));

      const smsData = await db.select({
        totalMessages: sql<number>`SUM(${smsUsage.totalMessagesSent})::int`,
        totalCost: sql<string>`SUM(${smsUsage.totalCostUsd}::decimal)::text`,
        totalCharged: sql<string>`SUM(${smsUsage.totalChargedUsd}::decimal)::text`,
      })
        .from(smsUsage)
        .where(and(...smsConditions));

      usageData.sms = {
        totalMessages: smsData[0]?.totalMessages || 0,
        totalCost: parseFloat(smsData[0]?.totalCost || '0'),
        totalCharged: parseFloat(smsData[0]?.totalCharged || '0'),
      };
    }

    // Fetch AI usage
    if (type === 'all' || type === 'ai') {
      const aiConditions = [
        gte(aiUsage.periodStart, start),
        lte(aiUsage.periodEnd, end),
      ];

      if (userId) aiConditions.push(eq(aiUsage.userId, userId));
      if (organizationId) aiConditions.push(eq(aiUsage.organizationId, organizationId));

      const aiData = await db.select({
        totalRequests: sql<number>`SUM(${aiUsage.requestCount})::int`,
        totalCost: sql<string>`SUM(${aiUsage.totalCostUsd})::text`,
        overageRequests: sql<number>`SUM(${aiUsage.overageRequests})::int`,
      })
        .from(aiUsage)
        .where(and(...aiConditions));

      // Breakdown by feature
      const aiByFeature = await db.select({
        feature: aiUsage.feature,
        requests: sql<number>`SUM(${aiUsage.requestCount})::int`,
        cost: sql<string>`SUM(${aiUsage.totalCostUsd})::text`,
      })
        .from(aiUsage)
        .where(and(...aiConditions))
        .groupBy(aiUsage.feature);

      usageData.ai = {
        totalRequests: aiData[0]?.totalRequests || 0,
        totalCost: parseFloat(aiData[0]?.totalCost || '0'),
        overageRequests: aiData[0]?.overageRequests || 0,
        byFeature: aiByFeature.map(f => ({
          feature: f.feature,
          requests: f.requests,
          cost: parseFloat(f.cost || '0'),
        })),
      };
    }

    // Fetch storage usage
    if (type === 'all' || type === 'storage') {
      const storageConditions = [
        gte(storageUsage.periodStart, start),
        lte(storageUsage.periodEnd, end),
      ];

      if (userId) storageConditions.push(eq(storageUsage.userId, userId));
      if (organizationId) storageConditions.push(eq(storageUsage.organizationId, organizationId));

      const storageData = await db.select({
        totalBytes: sql<string>`MAX(${storageUsage.totalBytes})::text`,
        overageGb: sql<string>`MAX(${storageUsage.overageGb})::text`,
        overageCost: sql<string>`SUM(${storageUsage.overageCostUsd})::text`,
      })
        .from(storageUsage)
        .where(and(...storageConditions));

      usageData.storage = {
        totalBytes: parseInt(storageData[0]?.totalBytes || '0'),
        totalGb: (parseInt(storageData[0]?.totalBytes || '0') / (1024 ** 3)).toFixed(2),
        overageGb: parseFloat(storageData[0]?.overageGb || '0'),
        overageCost: parseFloat(storageData[0]?.overageCost || '0'),
      };
    }

    return NextResponse.json({
      success: true,
      usage: usageData,
    });
  } catch (error: any) {
    console.error('Admin usage API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data', details: error.message },
      { status: 500 }
    );
  }
}

