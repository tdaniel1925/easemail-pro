/**
 * Usage Tracking Utilities
 *
 * Track SMS, AI, and storage usage for billing purposes
 */

import { db } from '@/lib/db/drizzle';
import { usageRecords } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';

export interface UsageTrackingData {
  userId: string;
  organizationId?: string;
  type: 'sms' | 'ai' | 'storage' | 'email';
  quantity: number;
  unitPrice: number;
  metadata?: Record<string, any>;
}

/**
 * Track usage event
 */
export async function trackUsage(data: UsageTrackingData): Promise<void> {
  try {
    const totalCost = data.quantity * data.unitPrice;

    // Get current billing period (start of month to end of month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    await db.insert(usageRecords).values({
      userId: data.userId,
      organizationId: data.organizationId || null,
      type: data.type,
      quantity: data.quantity.toString(),
      unitPrice: data.unitPrice.toString(),
      totalCost: totalCost.toFixed(2),
      billingPeriodStart,
      billingPeriodEnd,
      metadata: data.metadata || {},
    });

    logger.payment.info('Usage tracked', {
      userId: data.userId,
      type: data.type,
      quantity: data.quantity,
      cost: totalCost,
    });
  } catch (error) {
    logger.payment.error('Failed to track usage', error);
    // Don't throw - usage tracking failures shouldn't break app functionality
  }
}

/**
 * Track SMS usage
 */
export async function trackSmsUsage(
  userId: string,
  organizationId: string | undefined,
  messageCount: number = 1,
  metadata?: Record<string, any>
): Promise<void> {
  const SMS_PRICE_PER_MESSAGE = 0.01; // $0.01 per SMS

  await trackUsage({
    userId,
    organizationId,
    type: 'sms',
    quantity: messageCount,
    unitPrice: SMS_PRICE_PER_MESSAGE,
    metadata,
  });
}

/**
 * Track AI usage (OpenAI API calls)
 */
export async function trackAiUsage(
  userId: string,
  organizationId: string | undefined,
  tokens: number,
  model: string,
  metadata?: Record<string, any>
): Promise<void> {
  // Pricing based on model
  const AI_PRICING: Record<string, number> = {
    'gpt-4': 0.00003, // $0.03 per 1K tokens
    'gpt-3.5-turbo': 0.000002, // $0.002 per 1K tokens
    'claude-3-opus': 0.000015, // $0.015 per 1K tokens
    'claude-3-sonnet': 0.000003, // $0.003 per 1K tokens
  };

  const unitPrice = AI_PRICING[model] || 0.000003; // Default to sonnet pricing

  await trackUsage({
    userId,
    organizationId,
    type: 'ai',
    quantity: tokens,
    unitPrice,
    metadata: {
      ...metadata,
      model,
    },
  });
}

/**
 * Track storage usage
 */
export async function trackStorageUsage(
  userId: string,
  organizationId: string | undefined,
  bytes: number,
  metadata?: Record<string, any>
): Promise<void> {
  const STORAGE_PRICE_PER_GB = 0.02; // $0.02 per GB per month
  const gigabytes = bytes / (1024 * 1024 * 1024);

  await trackUsage({
    userId,
    organizationId,
    type: 'storage',
    quantity: gigabytes,
    unitPrice: STORAGE_PRICE_PER_GB,
    metadata,
  });
}

/**
 * Track email usage
 */
export async function trackEmailUsage(
  userId: string,
  organizationId: string | undefined,
  emailCount: number = 1,
  metadata?: Record<string, any>
): Promise<void> {
  const EMAIL_PRICE_PER_MESSAGE = 0.001; // $0.001 per email

  await trackUsage({
    userId,
    organizationId,
    type: 'email',
    quantity: emailCount,
    unitPrice: EMAIL_PRICE_PER_MESSAGE,
    metadata,
  });
}

/**
 * Get usage summary for billing period
 */
export async function getUsageSummary(
  userId: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): Promise<{
  sms: { quantity: number; cost: number };
  ai: { quantity: number; cost: number };
  storage: { quantity: number; cost: number };
  email: { quantity: number; cost: number };
  total: number;
}> {
  try {
    const records = await db.query.usageRecords.findMany({
      where: (records, { eq, and, gte, lte }) =>
        and(
          eq(records.userId, userId),
          gte(records.createdAt, billingPeriodStart),
          lte(records.createdAt, billingPeriodEnd)
        ),
    });

    const summary = {
      sms: { quantity: 0, cost: 0 },
      ai: { quantity: 0, cost: 0 },
      storage: { quantity: 0, cost: 0 },
      email: { quantity: 0, cost: 0 },
      total: 0,
    };

    for (const record of records) {
      const type = record.type as 'sms' | 'ai' | 'storage' | 'email';
      if (type in summary) {
        summary[type].quantity += Number(record.quantity);
        summary[type].cost += Number(record.totalCost);
        summary.total += Number(record.totalCost);
      }
    }

    return summary;
  } catch (error) {
    logger.payment.error('Failed to get usage summary', error);
    throw error;
  }
}

/**
 * Get organization usage summary
 */
export async function getOrganizationUsageSummary(
  organizationId: string,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): Promise<{
  sms: { quantity: number; cost: number };
  ai: { quantity: number; cost: number };
  storage: { quantity: number; cost: number };
  email: { quantity: number; cost: number };
  total: number;
  userCount: number;
}> {
  try {
    const records = await db.query.usageRecords.findMany({
      where: (records, { eq, and, gte, lte }) =>
        and(
          eq(records.organizationId, organizationId),
          gte(records.createdAt, billingPeriodStart),
          lte(records.createdAt, billingPeriodEnd)
        ),
    });

    const summary = {
      sms: { quantity: 0, cost: 0 },
      ai: { quantity: 0, cost: 0 },
      storage: { quantity: 0, cost: 0 },
      email: { quantity: 0, cost: 0 },
      total: 0,
      userCount: new Set<string>(),
    };

    for (const record of records) {
      const type = record.type as 'sms' | 'ai' | 'storage' | 'email';
      if (type in summary) {
        summary[type].quantity += Number(record.quantity);
        summary[type].cost += Number(record.totalCost);
        summary.total += Number(record.totalCost);
        summary.userCount.add(record.userId);
      }
    }

    return {
      sms: summary.sms,
      ai: summary.ai,
      storage: summary.storage,
      email: summary.email,
      total: summary.total,
      userCount: summary.userCount.size,
    };
  } catch (error) {
    logger.payment.error('Failed to get organization usage summary', error);
    throw error;
  }
}
