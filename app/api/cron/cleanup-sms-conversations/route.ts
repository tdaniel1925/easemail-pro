/**
 * SMS Conversation Cleanup Cron Job
 * Expires inactive conversations after 30 days
 * Run daily via Vercel Cron: https://vercel.com/docs/cron-jobs
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-sms-conversations",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { smsConversations } from '@/lib/db/schema';
import { lt, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Authorization check (Vercel Cron secret)
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Fallback: Allow if no secret is configured (for testing)
  if (!cronSecret) {
    console.warn('⚠️ CRON_SECRET not configured - allowing request');
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    // Authorization check
    if (!isAuthorized(request)) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 Starting SMS conversation cleanup...');

    // Delete conversations inactive for more than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.delete(smsConversations)
      .where(lt(smsConversations.lastMessageAt, thirtyDaysAgo))
      .returning();

    const deletedCount = result.length;

    console.log(`✅ Cleanup complete: Deleted ${deletedCount} inactive conversations`);

    // Get remaining active conversations count
    const activeConversations = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(smsConversations);

    const activeCount = activeConversations[0]?.count || 0;

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      remaining: activeCount,
      cutoffDate: thirtyDaysAgo.toISOString(),
      message: `Deleted ${deletedCount} inactive conversations (> 30 days old)`,
    });

  } catch (error: any) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Manual cleanup trigger (for testing)
 * Usage: POST /api/cron/cleanup-sms-conversations with {"daysInactive": 30}
 */
export async function POST(request: NextRequest) {
  try {
    // Authorization check
    if (!isAuthorized(request)) {
      console.error('❌ Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const daysInactive = body.daysInactive || 30;

    console.log(`🧹 Manual cleanup triggered (${daysInactive} days inactive)...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const result = await db.delete(smsConversations)
      .where(lt(smsConversations.lastMessageAt, cutoffDate))
      .returning();

    const deletedCount = result.length;

    console.log(`✅ Manual cleanup complete: Deleted ${deletedCount} conversations`);

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      daysInactive,
      cutoffDate: cutoffDate.toISOString(),
      deletedConversations: result.map(conv => ({
        id: conv.id,
        contactPhone: conv.contactPhone,
        lastMessageAt: conv.lastMessageAt,
        messageCount: conv.messageCount,
      })),
    });

  } catch (error: any) {
    console.error('❌ Manual cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}

