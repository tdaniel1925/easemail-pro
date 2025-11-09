/**
 * Scheduled Email Processor
 * Sends emails that have been scheduled for future delivery
 */

import { Job } from 'bullmq';
import { ScheduledEmailJob } from '../client';
import { db } from '@/lib/db';
import { emailDrafts, emailAccounts } from '@/lib/db/schema';
import { eq, and, lte, isNull } from 'drizzle-orm';
import Nylas from 'nylas';

export async function processScheduledEmail(job: Job<ScheduledEmailJob>) {
  const { draftId, userId, accountId, scheduledAt } = job.data;

  console.log(`📧 Processing scheduled email: ${draftId} for user ${userId}`);

  try {
    // 1. Fetch the draft
    const draft = await db.query.emailDrafts.findFirst({
      where: and(
        eq(emailDrafts.id, draftId),
        eq(emailDrafts.userId, userId)
      ),
    });

    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    // 2. Check if already sent (by checking if it still exists as a draft)
    // In production, drafts are typically deleted after sending
    // For now, we'll just process it

    // 3. Check if scheduled time has arrived
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    if (scheduled > now) {
      console.log(`⏰ Draft ${draftId} not yet ready to send. Scheduled for ${scheduled}`);
      throw new Error('Scheduled time not yet reached'); // Will retry
    }

    // 4. Get account details
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account || !account.accessToken) {
      throw new Error(`Account ${accountId} not found or missing access token`);
    }

    // 5. Initialize Nylas client
    const nylas = new Nylas({
      apiKey: process.env.NYLAS_API_KEY!,
    });

    // 6. Send the email
    const response = await nylas.messages.send({
      identifier: account.nylasGrantId!,
      requestBody: {
        to: draft.toRecipients || [],
        cc: draft.cc || undefined,
        bcc: draft.bcc || undefined,
        subject: draft.subject || '(no subject)',
        body: draft.bodyHtml || draft.bodyText || '',
      },
    });

    // 7. Delete the draft after sending (standard email client behavior)
    await db.delete(emailDrafts)
      .where(eq(emailDrafts.id, draftId));

    console.log(`✅ Scheduled email ${draftId} sent successfully`);

    return {
      success: true,
      messageId: response.data.id,
      sentAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ Failed to send scheduled email ${draftId}:`, error);
    throw error; // Will trigger retry
  }
}
