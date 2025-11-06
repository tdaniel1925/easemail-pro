import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { webhookEvents } from '@/lib/db/schema';
import { and, lt, eq, sql } from 'drizzle-orm';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook Events Cleanup Cron Job
 * Runs daily to clean up old processed webhook events
 * Prevents table bloat which degrades insert performance
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('❌ Unauthorized cron request');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('🧹 Starting webhook events cleanup cron job...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete processed webhook events older than 30 days
    const result = await db
      .delete(webhookEvents)
      .where(
        and(
          eq(webhookEvents.processed, true),
          lt(webhookEvents.processedAt, thirtyDaysAgo)
        )
      )
      .returning();

    const deletedCount = result.length;

    console.log(`✅ Cleanup complete: Deleted ${deletedCount} old webhook events`);

    // Get remaining counts
    const totalCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(webhookEvents);

    const unprocessedCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(webhookEvents)
      .where(eq(webhookEvents.processed, false));

    const total = totalCount[0]?.count || 0;
    const unprocessed = unprocessedCount[0]?.count || 0;

    // Alert if unprocessed count is high
    if (unprocessed > 1000) {
      console.warn(`⚠️ High unprocessed webhook count: ${unprocessed}`);
      Sentry.captureMessage('High unprocessed webhook count', {
        level: 'warning',
        extra: {
          unprocessedCount: unprocessed,
          totalCount: total,
        },
      });
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      remaining: {
        total,
        unprocessed,
        processed: total - unprocessed,
      },
      cutoffDate: thirtyDaysAgo.toISOString(),
      message: `Deleted ${deletedCount} old webhook events (> 30 days old)`,
    });
  } catch (error: any) {
    console.error('❌ Webhook cleanup cron failed:', error);
    Sentry.captureException(error, {
      tags: {
        component: 'webhook-cleanup',
        cron: 'daily',
      },
    });
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}

