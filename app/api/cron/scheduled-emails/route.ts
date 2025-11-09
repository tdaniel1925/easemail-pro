/**
 * Cron Job: Process Scheduled Emails
 * Runs every minute to check for emails ready to be sent
 *
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/scheduled-emails",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailDrafts, emailAccounts } from '@/lib/db/schema';
import { and, lte, isNull, eq } from 'drizzle-orm';
import { queueManager, QueueName } from '@/lib/queue/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max

export async function GET(request: Request) {
  try {
    // Verify cron secret (security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📧 [Cron] Checking for scheduled emails...');

    const now = new Date();

    // Find all drafts scheduled to be sent now or earlier
    // Note: We check scheduledAt only. The processor will handle duplicate sends.
    const scheduledDrafts = await db.query.emailDrafts.findMany({
      where: lte(emailDrafts.scheduledAt, now),
      limit: 100, // Process up to 100 at a time
    });

    console.log(`📧 [Cron] Found ${scheduledDrafts.length} scheduled emails to send`);

    if (scheduledDrafts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled emails to send',
        count: 0,
      });
    }

    // Queue each email for sending
    const queuedJobs = [];
    for (const draft of scheduledDrafts) {
      try {
        const job = await queueManager.addJob(
          QueueName.EMAIL_SCHEDULED,
          `send-scheduled-${draft.id}`,
          {
            draftId: draft.id,
            userId: draft.userId,
            accountId: draft.accountId,
            scheduledAt: draft.scheduledAt,
          }
        );

        queuedJobs.push({
          draftId: draft.id,
          jobId: job.id,
        });
      } catch (error) {
        console.error(`❌ [Cron] Failed to queue email ${draft.id}:`, error);
      }
    }

    console.log(`✅ [Cron] Queued ${queuedJobs.length} emails for sending`);

    return NextResponse.json({
      success: true,
      message: `Queued ${queuedJobs.length} scheduled emails`,
      count: queuedJobs.length,
      jobs: queuedJobs,
    });
  } catch (error) {
    console.error('❌ [Cron] Scheduled emails cron error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
