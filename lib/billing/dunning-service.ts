/**
 * Payment Dunning Service
 * 
 * Handles failed payments with intelligent retry logic and customer communication
 */

import { db } from '@/lib/db';
import { billingTransactions, billingNotices } from '@/lib/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';

export interface BillingTransaction {
  id: string;
  userId?: string;
  organizationId?: string;
  invoiceId?: string;
  amount: number;
  status: string;
  retryCount?: number;
  nextRetryAt?: Date;
  failureReason?: string;
}

/**
 * Handle a failed payment with retry logic
 */
export async function handleFailedPayment(
  transaction: BillingTransaction,
  error: string
): Promise<void> {
  const retryCount = transaction.retryCount || 0;
  const maxRetries = 3;
  
  if (retryCount < maxRetries) {
    // Schedule retry
    const retryDelay = getRetryDelay(retryCount); // 1, 3, 7 days
    const retryDate = addDays(new Date(), retryDelay);
    
    await db
      .update(billingTransactions)
      .set({
        status: 'retry_scheduled',
        retryCount: retryCount + 1,
        nextRetryAt: retryDate,
        lastRetryAt: new Date(),
        failureReason: error,
      })
      .where(eq(billingTransactions.id, transaction.id));
    
    // Create billing notice
    await createBillingNotice({
      userId: transaction.userId,
      organizationId: transaction.organizationId,
      noticeType: 'payment_retry',
      severity: 'warning',
      title: `Payment Failed - Retry Scheduled (Attempt ${retryCount + 1}/3)`,
      message: `Your payment of $${transaction.amount} failed. We'll automatically retry on ${formatDate(retryDate)}.`,
      transactionId: transaction.id,
      invoiceId: transaction.invoiceId,
      metadata: {
        nextRetryDate: retryDate,
        attemptNumber: retryCount + 1,
        error,
      },
    });
    
    // Send email notification
    await sendPaymentFailedEmail(transaction, retryDate, retryCount + 1);
    
    console.log(
      `[Dunning] Scheduled retry ${retryCount + 1}/${maxRetries} for ` +
      `transaction ${transaction.id} on ${retryDate.toISOString()}`
    );
  } else {
    // Max retries reached - mark as failed
    await db
      .update(billingTransactions)
      .set({
        status: 'failed',
        failureReason: error,
      })
      .where(eq(billingTransactions.id, transaction.id));
    
    // Start grace period (handled by account suspension service)
    console.log(
      `[Dunning] Max retries reached for transaction ${transaction.id}. ` +
      `Account will enter grace period.`
    );
    
    // Note: Account suspension is handled by the suspension service
    // which will be triggered by the failed transaction
  }
}

/**
 * Retry scheduled payments (run daily via cron)
 */
export async function retryScheduledPayments(): Promise<{
  attempted: number;
  succeeded: number;
  failed: number;
}> {
  const now = new Date();
  
  // Get transactions scheduled for retry
  const scheduledRetries = await db
    .select()
    .from(billingTransactions)
    .where(
      and(
        eq(billingTransactions.status, 'retry_scheduled'),
        lte(billingTransactions.nextRetryAt, now)
      )
    );
  
  let succeeded = 0;
  let failed = 0;
  
  for (const transaction of scheduledRetries) {
    try {
      const success = await processRetryPayment(transaction);
      if (success) {
        succeeded++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`[Dunning] Error retrying payment ${transaction.id}:`, error);
      failed++;
    }
  }
  
  console.log(
    `[Dunning] Retry summary: ${scheduledRetries.length} attempted, ` +
    `${succeeded} succeeded, ${failed} failed`
  );
  
  return {
    attempted: scheduledRetries.length,
    succeeded,
    failed,
  };
}

/**
 * Process a retry payment
 */
async function processRetryPayment(transaction: any): Promise<boolean> {
  console.log(`[Dunning] Retrying payment for transaction ${transaction.id}`);
  
  try {
    // TODO: Implement payment processing
    // This will be implemented when the monthly invoice automation is built
    console.warn('[Dunning] Payment processor not yet implemented - skipping retry');
    
    // For now, just mark the retry attempt
    await db
      .update(billingTransactions)
      .set({
        lastRetryAt: new Date(),
      })
      .where(eq(billingTransactions.id, transaction.id));
    
    return false;
  } catch (error: any) {
    await handleFailedPayment(transaction, error.message || 'Unknown error');
    return false;
  }
}

/**
 * Get retry delay in days based on attempt number
 */
function getRetryDelay(attemptNumber: number): number {
  const delays = [1, 3, 7]; // Days
  return delays[attemptNumber] || 7;
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Create a billing notice
 */
async function createBillingNotice(params: {
  userId?: string;
  organizationId?: string;
  noticeType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  transactionId?: string;
  invoiceId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  await db.insert(billingNotices).values({
    userId: params.userId || null,
    organizationId: params.organizationId || null,
    noticeType: params.noticeType,
    severity: params.severity,
    title: params.title,
    message: params.message,
    transactionId: params.transactionId || null,
    invoiceId: params.invoiceId || null,
    status: 'pending',
  });
}

/**
 * Send payment failed email
 */
async function sendPaymentFailedEmail(
  transaction: BillingTransaction,
  retryDate: Date,
  attemptNumber: number
): Promise<void> {
  const recipient = transaction.userId || transaction.organizationId;
  if (!recipient) return;
  
  // Get user/org email
  const email = await getEntityEmail(recipient);
  if (!email) return;
  
  await sendEmail({
    to: email,
    subject: `Payment Failed - Retry Scheduled (Attempt ${attemptNumber}/3)`,
    html: `
      <h2>Payment Failed</h2>
      <p>We were unable to process your payment of $${transaction.amount}.</p>
      <p><strong>We'll automatically retry on ${formatDate(retryDate)}.</strong></p>
      <p>If the payment fails again, you can update your payment method in your billing settings.</p>
      <p>Attempt: ${attemptNumber} of 3</p>
      <br/>
      <p>If you have any questions, please contact our support team.</p>
    `,
  });
}

/**
 * Send payment success email
 */
async function sendPaymentSuccessEmail(transaction: BillingTransaction): Promise<void> {
  const recipient = transaction.userId || transaction.organizationId;
  if (!recipient) return;
  
  const email = await getEntityEmail(recipient);
  if (!email) return;
  
  await sendEmail({
    to: email,
    subject: 'Payment Successful',
    html: `
      <h2>Payment Successful</h2>
      <p>Your payment of $${transaction.amount} was processed successfully.</p>
      <p>Thank you for your business!</p>
    `,
  });
}

/**
 * Get email for user or organization
 */
async function getEntityEmail(entityId: string): Promise<string | null> {
  const { users, organizations } = await import('@/lib/db/schema');
  
  // Try user first
  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, entityId))
    .limit(1);
  
  if (user) return user.email;
  
  // Try organization
  const [org] = await db
    .select({ email: organizations.billingEmail })
    .from(organizations)
    .where(eq(organizations.id, entityId))
    .limit(1);
  
  return org?.email || null;
}

/**
 * Get failed payment statistics
 */
export async function getFailedPaymentStats(days: number = 30): Promise<{
  totalFailed: number;
  totalAmount: number;
  byAttempt: Record<number, number>;
}> {
  const cutoffDate = addDays(new Date(), -days);
  
  const failed = await db
    .select()
    .from(billingTransactions)
    .where(
      and(
        eq(billingTransactions.status, 'failed'),
        gte(billingTransactions.createdAt, cutoffDate)
      )
    );
  
  const totalFailed = failed.length;
  const totalAmount = failed.reduce((sum, t) => sum + parseFloat(t.amountUsd || '0'), 0);
  
  const byAttempt = failed.reduce((acc, t) => {
    const attempts = t.retryCount || 0;
    acc[attempts] = (acc[attempts] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  return {
    totalFailed,
    totalAmount,
    byAttempt,
  };
}

// Import missing function
import { gte } from 'drizzle-orm';

