/**
 * Cron Job - Process Scheduled Emails
 * This endpoint is called every minute to send emails that are scheduled
 *
 * To set up on Vercel:
 * 1. Go to your project settings -> Cron Jobs
 * 2. Add: /api/cron/process-scheduled-emails
 * 3. Schedule: * * * * * (every minute)
 * 4. Add CRON_SECRET env variable for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { scheduledEmails, emailAccounts } from '@/lib/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { getNylasClient } from '@/lib/nylas-v3/config';
import { processEmailForTracking } from '@/lib/email-tracking';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max execution time

/**
 * Process scheduled emails that are due
 */
export async function GET(request: NextRequest) {
  try {
    // Security check: Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const now = new Date();
    console.log(`[Cron] Processing scheduled emails at ${now.toISOString()}`);

    // Find emails that are due to be sent
    const dueEmails = await db.query.scheduledEmails.findMany({
      where: and(
        eq(scheduledEmails.status, 'pending'),
        lte(scheduledEmails.scheduledFor, now)
      ),
      limit: 50, // Process max 50 emails per run
      with: {
        account: true,
      },
    });

    console.log(`[Cron] Found ${dueEmails.length} emails to send`);

    const results = {
      total: dueEmails.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each email
    for (const scheduled of dueEmails) {
      try {
        await processAndSendScheduledEmail(scheduled);
        results.sent++;
        console.log(`[Cron] Sent scheduled email ${scheduled.id}`);
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Email ${scheduled.id}: ${errorMessage}`);
        console.error(`[Cron] Failed to send ${scheduled.id}:`, error);

        // Update error status
        await db
          .update(scheduledEmails)
          .set({
            status: (scheduled.retryCount || 0) >= (scheduled.maxRetries || 3) ? 'failed' : 'pending',
            retryCount: (scheduled.retryCount || 0) + 1,
            errorMessage: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(scheduledEmails.id, scheduled.id));
      }
    }

    console.log(`[Cron] Completed: ${results.sent} sent, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      processed: results.total,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error('[Cron] Processing error:', error);
    return NextResponse.json({
      error: 'Failed to process scheduled emails',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Process and send a single scheduled email
 */
async function processAndSendScheduledEmail(scheduled: any) {
  const { account } = scheduled;

  if (!account || !account.nylasGrantId) {
    throw new Error('Account not found or missing Nylas grant ID');
  }

  // Prepare message data
  let bodyHtml = scheduled.bodyHtml || '';
  const bodyText = scheduled.bodyText || '';
  const subject = scheduled.subject || '(No Subject)';

  // Add tracking if enabled
  if ((scheduled.trackOpens || scheduled.trackClicks) && bodyHtml) {
    // Process tracking for first recipient (for multi-recipient emails, each gets unique tracking)
    const firstRecipient = scheduled.toRecipients[0];

    const trackingResult = await processEmailForTracking({
      userId: scheduled.userId,
      recipientEmail: firstRecipient.email,
      subject,
      htmlBody: bodyHtml,
      draftId: scheduled.draftId || undefined,
      trackingOptions: {
        trackOpens: scheduled.trackOpens,
        trackClicks: scheduled.trackClicks,
      },
    });

    bodyHtml = trackingResult.htmlWithTracking;
    console.log(`[Scheduled] Added tracking for ${scheduled.id}: ${trackingResult.trackingId}`);
  }

  // Send via Nylas
  const nylas = getNylasClient();

  const messageData: any = {
    to: scheduled.toRecipients,
    subject,
    body: bodyHtml || bodyText,
  };

  if (scheduled.cc && scheduled.cc.length > 0) {
    messageData.cc = scheduled.cc;
  }

  if (scheduled.bcc && scheduled.bcc.length > 0) {
    messageData.bcc = scheduled.bcc;
  }

  if (scheduled.attachments && scheduled.attachments.length > 0) {
    messageData.attachments = scheduled.attachments;
  }

  const response = await nylas.messages.send({
    identifier: account.nylasGrantId,
    requestBody: messageData,
  });

  // Update scheduled email status
  await db
    .update(scheduledEmails)
    .set({
      status: 'sent',
      sentAt: new Date(),
      providerMessageId: response.data.id,
      updatedAt: new Date(),
    })
    .where(eq(scheduledEmails.id, scheduled.id));

  console.log(`[Scheduled] Sent email ${scheduled.id} -> Nylas message ${response.data.id}`);
}
