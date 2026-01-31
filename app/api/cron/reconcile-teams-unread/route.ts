/**
 * MS Teams Unread Count Reconciliation Cron Job
 *
 * Periodically recalculates unread message counts to prevent drift.
 * This acts as a safety net to fix any unread count discrepancies.
 *
 * Schedule: Daily at 3 AM UTC
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/reconcile-teams-unread",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamsChats, teamsMessages } from '@/lib/db/schema';
import { eq, and, count, ne } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET || authHeader !== expectedAuth) {
      console.error('❌ Unauthorized cron job request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting Teams unread count reconciliation...');

    const startTime = Date.now();
    const stats = {
      total: 0,
      reconciled: 0,
      fixed: 0,
      errors: 0,
    };

    // Get all active chats
    const chats = await db.select().from(teamsChats);

    stats.total = chats.length;

    console.log(`📊 Found ${stats.total} chats to reconcile`);

    // Process each chat
    for (const chat of chats) {
      try {
        // Count actual unread messages in database
        const unreadResult = await db
          .select({ count: count() })
          .from(teamsMessages)
          .where(
            and(
              eq(teamsMessages.chatId, chat.id),
              eq(teamsMessages.isRead, false),
              eq(teamsMessages.isDeleted, false)
            )
          );

        const actualUnreadCount = unreadResult[0]?.count || 0;

        // Check if it differs from stored count
        if (actualUnreadCount !== chat.unreadCount) {
          console.log(
            `📝 Chat ${chat.teamsChatId}: fixing unread count (stored: ${chat.unreadCount}, actual: ${actualUnreadCount})`
          );

          // Update with correct count
          await db
            .update(teamsChats)
            .set({
              unreadCount: actualUnreadCount,
              updatedAt: new Date(),
            })
            .where(eq(teamsChats.id, chat.id));

          stats.fixed++;
        }

        stats.reconciled++;
      } catch (error: any) {
        stats.errors++;
        console.error(
          `❌ Error reconciling chat ${chat.teamsChatId}:`,
          error
        );
      }
    }

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      stats,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Teams unread count reconciliation completed:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Teams unread reconciliation cron job error:', error);
    return NextResponse.json(
      {
        error: 'Reconciliation failed',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual reconciliation (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    // TODO: Add admin session verification here

    console.log('🔧 Manual Teams unread count reconciliation triggered');

    // Run the reconciliation process
    const result = await GET(request);

    return result;
  } catch (error: any) {
    console.error('❌ Manual Teams reconciliation error:', error);
    return NextResponse.json(
      { error: 'Manual reconciliation failed', details: error.message },
      { status: 500 }
    );
  }
}
