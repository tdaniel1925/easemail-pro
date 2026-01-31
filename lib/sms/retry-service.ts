/**
 * SMS Retry Service
 * Handles automatic retries for failed SMS deliveries
 */

import { db } from '@/lib/db/drizzle';
import { smsMessages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendSMS } from './twilio-client';

interface RetryConfig {
  maxAttempts: number;
  retryDelays: number[]; // in milliseconds
  retryableStatuses: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  retryDelays: [
    5 * 60 * 1000,      // 5 minutes
    30 * 60 * 1000,     // 30 minutes
    2 * 60 * 60 * 1000  // 2 hours
  ],
  retryableStatuses: ['failed', 'undelivered'],
};

/**
 * Retry sending an SMS
 */
export async function retrySMS(smsId: string, attempt: number = 1): Promise<boolean> {
  try {
    console.log(`📱 Retrying SMS ${smsId}, attempt ${attempt}`);

    // Get SMS record
    const sms = await db.query.smsMessages.findFirst({
      where: eq(smsMessages.id, smsId),
    });

    if (!sms) {
      console.error('SMS not found:', smsId);
      return false;
    }

    // Check if retryable
    if (!DEFAULT_RETRY_CONFIG.retryableStatuses.includes(sms.twilioStatus || '')) {
      console.log('SMS not retryable, status:', sms.twilioStatus);
      return false;
    }

    // Resend via Twilio
    const result = await sendSMS({
      to: sms.toPhone,
      from: sms.fromPhone,
      message: sms.messageBody,
    });

    if (result.success) {
      // Update with new Twilio SID
      await db.update(smsMessages)
        .set({
          twilioSid: result.sid,
          twilioStatus: result.status,
          twilioErrorCode: null,
          twilioErrorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(smsMessages.id, smsId));

      console.log('✅ SMS retry successful:', result.sid);
      return true;
    } else {
      // Update failure
      await db.update(smsMessages)
        .set({
          twilioStatus: 'failed',
          twilioErrorMessage: `Retry ${attempt} failed: ${result.error}`,
          updatedAt: new Date(),
        })
        .where(eq(smsMessages.id, smsId));

      // Schedule next retry if attempts remaining
      if (attempt < DEFAULT_RETRY_CONFIG.maxAttempts) {
        const delay = DEFAULT_RETRY_CONFIG.retryDelays[attempt - 1] || DEFAULT_RETRY_CONFIG.retryDelays[0];
        scheduleRetry(smsId, attempt + 1, delay);
      }

      return false;
    }
  } catch (error) {
    console.error('❌ Retry error:', error);
    return false;
  }
}

/**
 * Schedule a retry using BullMQ persistent queue
 */
async function scheduleRetry(smsId: string, attempt: number, delay: number) {
  // ✅ Use BullMQ persistent queue (survives server restarts)
  const { addSMSRetry } = await import('./retry-queue');

  // Get SMS details for queue job
  const sms = await db.query.smsMessages.findFirst({
    where: eq(smsMessages.id, smsId),
  });

  if (!sms) {
    console.error('SMS not found for scheduling retry:', smsId);
    return;
  }

  await addSMSRetry(smsId, attempt, sms.toPhone, sms.messageBody, delay);

  console.log(`⏰ Scheduled retry ${attempt} for SMS ${smsId} in ${delay}ms (${Math.round(delay / 60000)} minutes)`);
}

/**
 * Manual retry endpoint (for users to manually retry failed SMS)
 */
export async function manualRetrySMS(smsId: string, userId: string): Promise<boolean> {
  // Verify ownership
  const sms = await db.query.smsMessages.findFirst({
    where: and(
      eq(smsMessages.id, smsId),
      eq(smsMessages.userId, userId)
    ),
  });

  if (!sms) {
    throw new Error('SMS not found or unauthorized');
  }

  return retrySMS(smsId, 1);
}

/**
 * Get retry status for an SMS
 */
export async function getRetryStatus(smsId: string): Promise<{
  canRetry: boolean;
  reason?: string;
}> {
  const sms = await db.query.smsMessages.findFirst({
    where: eq(smsMessages.id, smsId),
  });

  if (!sms) {
    return { canRetry: false, reason: 'SMS not found' };
  }

  if (!DEFAULT_RETRY_CONFIG.retryableStatuses.includes(sms.twilioStatus || '')) {
    return { canRetry: false, reason: `Status '${sms.twilioStatus}' is not retryable` };
  }

  return { canRetry: true };
}

