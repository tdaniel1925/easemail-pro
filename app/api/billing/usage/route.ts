import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, sms_usage, ai_usage, storage_usage } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/usage
 * Get current user's usage metrics for the current billing period
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get current billing period start (first day of current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // SMS Usage
    const smsResult = await db
      .select({
        count: sql<number>`COALESCE(SUM(${sms_usage.messageCount}), 0)`,
        cost: sql<number>`COALESCE(SUM(${sms_usage.cost}), 0)`,
      })
      .from(sms_usage)
      .where(
        and(
          eq(sms_usage.userId, user.id),
          gte(sms_usage.createdAt, periodStart)
        )
      );

    const smsData = smsResult[0] || { count: 0, cost: 0 };

    // AI Usage
    const aiResult = await db
      .select({
        count: sql<number>`COALESCE(SUM(${ai_usage.requestCount}), 0)`,
        cost: sql<number>`COALESCE(SUM(${ai_usage.cost}), 0)`,
      })
      .from(ai_usage)
      .where(
        and(
          eq(ai_usage.userId, user.id),
          gte(ai_usage.createdAt, periodStart)
        )
      );

    const aiData = aiResult[0] || { count: 0, cost: 0 };

    // Storage Usage
    const storageResult = await db
      .select({
        totalGB: sql<number>`COALESCE(SUM(${storage_usage.storageUsed}), 0) / 1073741824.0`, // Convert bytes to GB
        cost: sql<number>`COALESCE(SUM(${storage_usage.cost}), 0)`,
      })
      .from(storage_usage)
      .where(
        and(
          eq(storage_usage.userId, user.id),
          gte(storage_usage.createdAt, periodStart)
        )
      );

    const storageData = storageResult[0] || { totalGB: 0, cost: 0 };

    // Calculate total cost
    const totalCost = Number(smsData.cost) + Number(aiData.cost) + Number(storageData.cost);

    return NextResponse.json({
      success: true,
      sms: {
        count: Number(smsData.count),
        cost: Number(smsData.cost),
      },
      ai: {
        count: Number(aiData.count),
        cost: Number(aiData.cost),
      },
      storage: {
        usedGB: Number(storageData.totalGB),
        cost: Number(storageData.cost),
      },
      total: totalCost,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
