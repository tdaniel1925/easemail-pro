/**
 * Usage Stats API Route
 * GET /api/attachments/usage
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { attachments } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

const COST_PER_FILE = 0.003; // $0.003 per AI-processed file

export async function GET() {
  try {
    const userId = '00000000-0000-0000-0000-000000000000';

    // Get current month start
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Total processed
    const [totalStats] = await db
      .select({
        totalProcessed: sql<number>`count(*) filter (where ${attachments.aiProcessed} = true)::int`,
        totalSize: sql<number>`sum(${attachments.fileSizeBytes})::bigint`,
      })
      .from(attachments)
      .where(eq(attachments.userId, userId));

    // Monthly processed
    const [monthlyStats] = await db
      .select({
        monthlyProcessed: sql<number>`count(*)::int`,
      })
      .from(attachments)
      .where(
        and(
          eq(attachments.userId, userId),
          eq(attachments.aiProcessed, true),
          gte(attachments.processedAt, monthStart)
        )
      );

    const totalProcessed = totalStats?.totalProcessed || 0;
    const monthlyProcessed = monthlyStats?.monthlyProcessed || 0;
    const totalCost = totalProcessed * COST_PER_FILE;
    const monthlyCost = monthlyProcessed * COST_PER_FILE;
    const storageUsed = Number(totalStats?.totalSize || 0);

    return NextResponse.json({
      totalProcessed,
      totalCost,
      monthlyProcessed,
      monthlyCost,
      storageUsed,
    });

  } catch (error: any) {
    console.error('Usage stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage stats', details: error.message },
      { status: 500 }
    );
  }
}

