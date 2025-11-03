/**
 * Automated Billing System
 * 
 * Handles scheduled billing runs, charging payment methods on file,
 * retry logic for failed charges, and notifications.
 */

import { db } from '@/lib/db/drizzle';
import { 
  billingConfig, 
  billingRuns, 
  billingTransactions,
  paymentMethodRequirements,
  users, 
  organizations,
  paymentMethods,
  smsUsage,
  aiUsage,
  storageUsage,
  invoices
} from '@/lib/db/schema';
import { eq, and, gte, lte, isNull, sql } from 'drizzle-orm';
import { generateInvoice } from './invoice-generator';
import Stripe from 'stripe';
import {
  sendBillingRunNotification,
  sendChargeSuccessEmail,
  sendChargeFailureEmail,
} from './email-notifications';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export interface BillingConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hourOfDay?: number;
  autoRetry: boolean;
  maxRetries: number;
  retryDelayHours: number;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notificationEmail?: string;
  smsChargeThresholdUsd: number;
  aiChargeThresholdUsd: number;
  minimumChargeUsd: number;
  gracePeriodDays: number;
}

export interface BillingRunResult {
  runId: string;
  accountsProcessed: number;
  chargesSuccessful: number;
  chargesFailed: number;
  totalAmountCharged: number;
  errors: Array<{
    userId?: string;
    organizationId?: string;
    error: string;
  }>;
}

export interface PendingCharge {
  userId?: string;
  organizationId?: string;
  smsCharges: number;
  aiCharges: number;
  storageCharges: number;
  totalCharges: number;
  hasPaymentMethod: boolean;
  isPromoUser: boolean;
}

/**
 * Get current billing configuration
 */
export async function getBillingConfig(): Promise<BillingConfig | null> {
  const config = await db.query.billingConfig.findFirst();
  
  if (!config) return null;
  
  return {
    enabled: config.enabled || false,
    frequency: (config.frequency as any) || 'monthly',
    dayOfWeek: config.dayOfWeek || undefined,
    dayOfMonth: config.dayOfMonth || undefined,
    hourOfDay: config.hourOfDay || 2,
    autoRetry: config.autoRetry || true,
    maxRetries: config.maxRetries || 3,
    retryDelayHours: config.retryDelayHours || 24,
    notifyOnSuccess: config.notifyOnSuccess || false,
    notifyOnFailure: config.notifyOnFailure || true,
    notificationEmail: config.notificationEmail || undefined,
    smsChargeThresholdUsd: parseFloat(config.smsChargeThresholdUsd || '1.00'),
    aiChargeThresholdUsd: parseFloat(config.aiChargeThresholdUsd || '5.00'),
    minimumChargeUsd: parseFloat(config.minimumChargeUsd || '0.50'),
    gracePeriodDays: config.gracePeriodDays || 3,
  };
}

/**
 * Update billing configuration
 */
export async function updateBillingConfig(config: Partial<BillingConfig>): Promise<void> {
  const existing = await db.query.billingConfig.findFirst();
  
  if (existing) {
    await db.update(billingConfig)
      .set({
        ...config,
        updatedAt: new Date(),
      })
      .where(eq(billingConfig.id, existing.id));
  } else {
    await db.insert(billingConfig).values({
      ...config,
    } as any);
  }
}

/**
 * Calculate pending charges for a user or organization
 */
export async function calculatePendingCharges(
  userId?: string,
  organizationId?: string
): Promise<PendingCharge> {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const now = new Date();
  
  // Get user details
  const user = userId ? await db.query.users.findFirst({
    where: eq(users.id, userId),
  }) : null;
  
  // Check if promo user (free access, no billing)
  const isPromoUser = user?.isPromoUser || false;
  
  // Check if user has payment method
  const paymentMethodsCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(paymentMethods)
    .where(
      and(
        userId ? eq(paymentMethods.userId, userId) : sql`true`,
        organizationId ? eq(paymentMethods.organizationId, organizationId) : sql`true`,
        eq(paymentMethods.status, 'active')
      )
    );
  
  const hasPaymentMethod = (paymentMethodsCount[0]?.count || 0) > 0;
  
  // Calculate SMS charges
  const smsUsageRecords = await db.select()
    .from(smsUsage)
    .where(
      and(
        userId ? eq(smsUsage.userId, userId) : sql`true`,
        gte(smsUsage.periodStart, startOfMonth),
        lte(smsUsage.periodEnd, now),
        eq(smsUsage.billingStatus, 'pending')
      )
    );
  
  const smsCharges = smsUsageRecords.reduce((sum, record) => {
    return sum + parseFloat(record.totalCostUsd || '0');
  }, 0);
  
  // Calculate AI charges
  const aiUsageRecords = await db.select()
    .from(aiUsage)
    .where(
      and(
        userId ? eq(aiUsage.userId, userId) : sql`true`,
        organizationId ? eq(aiUsage.organizationId, organizationId) : sql`true`,
        gte(aiUsage.periodStart, startOfMonth),
        lte(aiUsage.periodEnd, now)
      )
    );
  
  const aiCharges = aiUsageRecords.reduce((sum, record) => {
    return sum + parseFloat(record.totalCostUsd || '0');
  }, 0);
  
  // Calculate storage charges
  const storageUsageRecords = await db.select()
    .from(storageUsage)
    .where(
      and(
        userId ? eq(storageUsage.userId, userId) : sql`true`,
        organizationId ? eq(storageUsage.organizationId, organizationId) : sql`true`,
        gte(storageUsage.periodStart, startOfMonth),
        lte(storageUsage.periodEnd, now)
      )
    );
  
  const storageCharges = storageUsageRecords.reduce((sum, record) => {
    return sum + parseFloat(record.overageCostUsd || '0');
  }, 0);
  
  return {
    userId,
    organizationId,
    smsCharges,
    aiCharges,
    storageCharges,
    totalCharges: smsCharges + aiCharges + storageCharges,
    hasPaymentMethod,
    isPromoUser,
  };
}

/**
 * Get all accounts with pending charges
 */
export async function getAccountsWithPendingCharges(): Promise<PendingCharge[]> {
  const config = await getBillingConfig();
  if (!config) return [];
  
  // Get all users (excluding promo users and free tier if no charges)
  const allUsers = await db.select().from(users);
  
  const pendingCharges: PendingCharge[] = [];
  
  for (const user of allUsers) {
    // Skip promo users
    if (user.isPromoUser) {
      console.log(`⏭️  Skipping promo user: ${user.email}`);
      continue;
    }
    
    // Skip free tier users (they shouldn't have charges anyway, but double-check)
    if (user.subscriptionTier === 'free') {
      const charges = await calculatePendingCharges(user.id);
      if (charges.totalCharges < config.minimumChargeUsd) {
        continue;
      }
    }
    
    const charges = await calculatePendingCharges(user.id, user.organizationId || undefined);
    
    // Only include if charges exceed threshold
    if (charges.totalCharges >= config.minimumChargeUsd) {
      pendingCharges.push(charges);
    }
  }
  
  return pendingCharges;
}

/**
 * Charge a payment method via Stripe
 */
async function chargePaymentMethod(
  paymentMethodId: string,
  amount: number,
  description: string,
  metadata: Record<string, any>
): Promise<{ success: boolean; chargeId?: string; error?: string }> {
  try {
    // Get payment method from database
    const pm = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, paymentMethodId),
    });
    
    if (!pm || !pm.stripePaymentMethodId) {
      return { success: false, error: 'Payment method not found' };
    }
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: pm.stripePaymentMethodId,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description,
      metadata,
    });
    
    if (paymentIntent.status === 'succeeded') {
      return { success: true, chargeId: paymentIntent.id };
    } else {
      return { success: false, error: `Payment status: ${paymentIntent.status}` };
    }
  } catch (error: any) {
    console.error('Stripe charge error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Process billing for a single account
 */
async function processAccountBilling(
  pending: PendingCharge,
  config: BillingConfig,
  billingRunId: string
): Promise<{ success: boolean; error?: string; transactionId?: string }> {
  const { userId, organizationId, totalCharges, hasPaymentMethod, isPromoUser } = pending;
  
  // Skip promo users
  if (isPromoUser) {
    return { success: true }; // Success but no charge
  }
  
  // Skip if below minimum
  if (totalCharges < config.minimumChargeUsd) {
    return { success: true }; // Success but no charge
  }
  
  // Check for payment method
  if (!hasPaymentMethod) {
    console.error(`❌ No payment method for user ${userId || organizationId}`);
    return { success: false, error: 'No payment method on file' };
  }
  
  // Get default payment method
  const defaultPM = await db.query.paymentMethods.findFirst({
    where: and(
      userId ? eq(paymentMethods.userId, userId) : sql`true`,
      organizationId ? eq(paymentMethods.organizationId, organizationId) : sql`true`,
      eq(paymentMethods.isDefault, true),
      eq(paymentMethods.status, 'active')
    ),
  });
  
  if (!defaultPM) {
    return { success: false, error: 'No default payment method found' };
  }
  
  // Create transaction record
  const [transaction] = await db.insert(billingTransactions).values({
    userId,
    organizationId,
    transactionType: 'charge',
    amountUsd: totalCharges.toFixed(2),
    description: `Automated billing for period ${new Date().toISOString().slice(0, 7)}`,
    billingRunId,
    status: 'processing',
    paymentMethodId: defaultPM.id,
    metadata: {
      smsCharges: pending.smsCharges,
      aiCharges: pending.aiCharges,
      storageCharges: pending.storageCharges,
    },
  }).returning();
  
  // Charge the payment method
  const chargeResult = await chargePaymentMethod(
    defaultPM.id,
    totalCharges,
    `EaseMail Usage Charges - ${new Date().toISOString().slice(0, 7)}`,
    {
      userId: userId || '',
      organizationId: organizationId || '',
      transactionId: transaction.id,
    }
  );
  
  if (chargeResult.success) {
    // Update transaction as successful
    await db.update(billingTransactions)
      .set({
        status: 'success',
        stripePaymentIntentId: chargeResult.chargeId,
        updatedAt: new Date(),
      })
      .where(eq(billingTransactions.id, transaction.id));
    
    // Mark usage records as charged
    if (userId) {
      await db.update(smsUsage)
        .set({
          billingStatus: 'charged',
          chargedAt: new Date(),
          transactionId: transaction.id,
        })
        .where(
          and(
            eq(smsUsage.userId, userId),
            eq(smsUsage.billingStatus, 'pending')
          )
        );
    }
    
    return { success: true, transactionId: transaction.id };
  } else {
    // Update transaction as failed
    await db.update(billingTransactions)
      .set({
        status: 'failed',
        failureReason: chargeResult.error,
        retryCount: 0,
        nextRetryAt: config.autoRetry 
          ? new Date(Date.now() + config.retryDelayHours * 60 * 60 * 1000)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(billingTransactions.id, transaction.id));
    
    return { success: false, error: chargeResult.error };
  }
}

/**
 * Main automated billing process
 */
export async function processAutomatedBilling(
  configOverride?: Partial<BillingConfig>
): Promise<BillingRunResult> {
  console.log('🚀 Starting automated billing process...');
  
  // Get configuration
  let config = await getBillingConfig();
  if (!config) {
    throw new Error('Billing configuration not found');
  }
  
  // Apply overrides if provided
  if (configOverride) {
    config = { ...config, ...configOverride };
  }
  
  if (!config.enabled && !configOverride?.enabled) {
    console.log('⏸️  Billing is disabled');
    return {
      runId: '',
      accountsProcessed: 0,
      chargesSuccessful: 0,
      chargesFailed: 0,
      totalAmountCharged: 0,
      errors: [{ error: 'Billing is disabled' }],
    };
  }
  
  // Create billing run record
  const [billingRun] = await db.insert(billingRuns).values({
    startedAt: new Date(),
    status: 'running',
    configSnapshot: config as any,
  }).returning();
  
  console.log(`📋 Billing run started: ${billingRun.id}`);
  
  // Get all accounts with pending charges
  const pendingAccounts = await getAccountsWithPendingCharges();
  console.log(`💰 Found ${pendingAccounts.length} accounts with pending charges`);
  
  let successful = 0;
  let failed = 0;
  let totalCharged = 0;
  const errors: BillingRunResult['errors'] = [];
  
  // Process each account
  for (const account of pendingAccounts) {
    console.log(`\n💳 Processing account: ${account.userId || account.organizationId}`);
    console.log(`   SMS: $${account.smsCharges.toFixed(2)}`);
    console.log(`   AI: $${account.aiCharges.toFixed(2)}`);
    console.log(`   Storage: $${account.storageCharges.toFixed(2)}`);
    console.log(`   Total: $${account.totalCharges.toFixed(2)}`);
    
    const result = await processAccountBilling(account, config, billingRun.id);
    
    if (result.success) {
      successful++;
      totalCharged += account.totalCharges;
      console.log(`   ✅ Success`);
    } else {
      failed++;
      errors.push({
        userId: account.userId,
        organizationId: account.organizationId,
        error: result.error || 'Unknown error',
      });
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }
  
  // Update billing run record
  await db.update(billingRuns)
    .set({
      completedAt: new Date(),
      status: failed === 0 ? 'completed' : 'partial',
      accountsProcessed: pendingAccounts.length,
      chargesSuccessful: successful,
      chargesFailed: failed,
      totalAmountChargedUsd: totalCharged.toFixed(2),
      metadata: { errors },
    })
    .where(eq(billingRuns.id, billingRun.id));
  
  console.log(`\n✅ Billing run completed!`);
  console.log(`   Processed: ${pendingAccounts.length}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total charged: $${totalCharged.toFixed(2)}`);
  
  const runResult: BillingRunResult = {
    runId: billingRun.id,
    accountsProcessed: pendingAccounts.length,
    chargesSuccessful: successful,
    chargesFailed: failed,
    totalAmountCharged: totalCharged,
    errors,
  };
  
  // Send notification if configured
  if (config.notifyOnSuccess || (config.notifyOnFailure && failed > 0)) {
    await sendBillingNotification(billingRun.id, config, runResult);
  }
  
  return runResult;
}

/**
 * Retry failed charges
 */
export async function retryFailedCharges(): Promise<BillingRunResult> {
  console.log('🔄 Retrying failed charges...');
  
  const config = await getBillingConfig();
  if (!config) {
    throw new Error('Billing configuration not found');
  }
  
  // Get failed transactions that need retry
  const failedTransactions = await db.select()
    .from(billingTransactions)
    .where(
      and(
        eq(billingTransactions.status, 'failed'),
        sql`${billingTransactions.nextRetryAt} <= NOW()`,
        sql`${billingTransactions.retryCount} < ${config.maxRetries}`
      )
    );
  
  console.log(`Found ${failedTransactions.length} transactions to retry`);
  
  // Create a new billing run for retries
  const [billingRun] = await db.insert(billingRuns).values({
    startedAt: new Date(),
    status: 'running',
    configSnapshot: { ...config, isRetry: true } as any,
  }).returning();
  
  let successful = 0;
  let failed = 0;
  let totalCharged = 0;
  const errors: BillingRunResult['errors'] = [];
  
  for (const transaction of failedTransactions) {
    const pm = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, transaction.paymentMethodId!),
    });
    
    if (!pm) {
      errors.push({
        userId: transaction.userId || undefined,
        organizationId: transaction.organizationId || undefined,
        error: 'Payment method not found',
      });
      continue;
    }
    
    const amount = parseFloat(transaction.amountUsd);
    const chargeResult = await chargePaymentMethod(
      pm.id,
      amount,
      transaction.description,
      transaction.metadata as any || {}
    );
    
    if (chargeResult.success) {
      await db.update(billingTransactions)
        .set({
          status: 'success',
          stripePaymentIntentId: chargeResult.chargeId,
          billingRunId: billingRun.id,
          updatedAt: new Date(),
        })
        .where(eq(billingTransactions.id, transaction.id));
      
      successful++;
      totalCharged += amount;
    } else {
      await db.update(billingTransactions)
        .set({
          retryCount: (transaction.retryCount || 0) + 1,
          lastRetryAt: new Date(),
          nextRetryAt: (transaction.retryCount || 0) + 1 < config.maxRetries
            ? new Date(Date.now() + config.retryDelayHours * 60 * 60 * 1000)
            : null,
          failureReason: chargeResult.error,
          updatedAt: new Date(),
        })
        .where(eq(billingTransactions.id, transaction.id));
      
      failed++;
      errors.push({
        userId: transaction.userId || undefined,
        organizationId: transaction.organizationId || undefined,
        error: chargeResult.error || 'Unknown error',
      });
    }
  }
  
  await db.update(billingRuns)
    .set({
      completedAt: new Date(),
      status: failed === 0 ? 'completed' : 'partial',
      accountsProcessed: failedTransactions.length,
      chargesSuccessful: successful,
      chargesFailed: failed,
      totalAmountChargedUsd: totalCharged.toFixed(2),
      metadata: { errors },
    })
    .where(eq(billingRuns.id, billingRun.id));
  
  console.log(`✅ Retry completed: ${successful} successful, ${failed} failed`);
  
  return {
    runId: billingRun.id,
    accountsProcessed: failedTransactions.length,
    chargesSuccessful: successful,
    chargesFailed: failed,
    totalAmountCharged: totalCharged,
    errors,
  };
}

/**
 * Send billing notification email
 */
async function sendBillingNotification(billingRunId: string, config: BillingConfig, result: BillingRunResult): Promise<void> {
  if (!config.notificationEmail) {
    console.log('⏭️  No notification email configured');
    return;
  }

  try {
    await sendBillingRunNotification(
      {
        runId: result.runId,
        accountsProcessed: result.accountsProcessed,
        chargesSuccessful: result.chargesSuccessful,
        chargesFailed: result.chargesFailed,
        totalAmountCharged: result.totalAmountCharged,
        errors: result.errors,
      },
      config.notificationEmail
    );
  } catch (error) {
    console.error('Failed to send billing notification:', error);
  }
}

/**
 * Check if user requires payment method
 */
export async function checkPaymentMethodRequirement(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (!user) return false;
  
  // Promo users don't need payment methods
  if (user.isPromoUser) return false;
  
  // Free tier users don't need payment methods
  if (user.subscriptionTier === 'free') return false;
  
  // All other tiers require payment methods
  return true;
}

