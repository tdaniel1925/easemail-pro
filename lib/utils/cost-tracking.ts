import { db } from '@/lib/db/drizzle';
import { sms_usage, ai_usage, storage_usage, costEntries } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { recordCostEntry } from '@/lib/usage/enhanced-cost-tracker';

/**
 * Cost Tracking Utility
 * Tracks actual costs for SMS, AI, and storage usage
 */

// Pricing constants (update these based on your actual provider costs)
export const PRICING = {
  sms: {
    perMessage: 0.0075, // Twilio average: $0.0075 per SMS
  },
  ai: {
    gpt4: {
      inputTokens: 0.03 / 1000, // $0.03 per 1K tokens
      outputTokens: 0.06 / 1000, // $0.06 per 1K tokens
    },
    gpt35: {
      inputTokens: 0.0015 / 1000, // $0.0015 per 1K tokens
      outputTokens: 0.002 / 1000, // $0.002 per 1K tokens
    },
    claude: {
      inputTokens: 0.015 / 1000, // $0.015 per 1K tokens
      outputTokens: 0.075 / 1000, // $0.075 per 1K tokens
    },
  },
  storage: {
    perGB: 0.023, // $0.023 per GB per month (AWS S3 standard)
  },
  nylas: {
    perAccount: 5.0, // $5 per account per month
  },
};

interface TrackSMSParams {
  userId: string;
  messageCount: number;
  actualCost?: number; // If you have the exact cost from Twilio webhook
}

/**
 * Track SMS cost
 */
export async function trackSMSCost({ userId, messageCount, actualCost }: TrackSMSParams) {
  try {
    const cost = actualCost ?? messageCount * PRICING.sms.perMessage;
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // End of current month

    // 1. Record in new costEntries table (for billing)
    await recordCostEntry({
      userId,
      service: 'sms',
      feature: 'sms_message',
      costUsd: cost,
      quantity: messageCount,
      unit: 'messages',
    });

    // 2. Update legacy sms_usage table (for backward compatibility)
    const existing = await db.query.sms_usage.findFirst({
      where: and(
        eq(sms_usage.userId, userId),
        gte(sms_usage.periodStart, periodStart),
        lte(sms_usage.periodEnd, periodEnd)
      ),
    });

    if (existing) {
      // Update existing record
      await db
        .update(sms_usage)
        .set({
          messageCount: (existing.messageCount || 0) + messageCount,
          cost: String(Number(existing.cost || 0) + cost),
          updatedAt: now,
        })
        .where(eq(sms_usage.id, existing.id));
    } else {
      // Create new record
      await db.insert(sms_usage).values({
        userId,
        periodStart,
        periodEnd,
        messageCount,
        cost: String(cost),
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`[Cost Tracking] SMS: ${messageCount} messages, $${cost.toFixed(4)} for user ${userId}`);
  } catch (error) {
    console.error('[Cost Tracking] Failed to track SMS cost:', error);
    // Don't throw - cost tracking failures shouldn't break the main flow
  }
}

interface TrackAIParams {
  userId: string;
  organizationId?: string;
  feature: string; // 'compose', 'summarize', 'assistant', etc.
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3-5-sonnet' | string;
  inputTokens: number;
  outputTokens: number;
  actualCost?: number; // If you have exact cost from provider
}

/**
 * Track AI API cost
 */
export async function trackAICost({
  userId,
  organizationId,
  feature,
  model,
  inputTokens,
  outputTokens,
  actualCost,
}: TrackAIParams) {
  try {
    let cost: number;

    if (actualCost !== undefined) {
      cost = actualCost;
    } else {
      // Calculate cost based on model
      if (model.includes('gpt-4')) {
        cost = inputTokens * PRICING.ai.gpt4.inputTokens + outputTokens * PRICING.ai.gpt4.outputTokens;
      } else if (model.includes('gpt-3.5')) {
        cost = inputTokens * PRICING.ai.gpt35.inputTokens + outputTokens * PRICING.ai.gpt35.outputTokens;
      } else if (model.includes('claude')) {
        cost = inputTokens * PRICING.ai.claude.inputTokens + outputTokens * PRICING.ai.claude.outputTokens;
      } else {
        // Default to GPT-3.5 pricing for unknown models
        cost = inputTokens * PRICING.ai.gpt35.inputTokens + outputTokens * PRICING.ai.gpt35.outputTokens;
      }
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Record in new costEntries table (for billing)
    await recordCostEntry({
      userId,
      organizationId,
      service: 'openai',
      feature,
      costUsd: cost,
      quantity: inputTokens + outputTokens,
      unit: 'tokens',
      metadata: {
        model,
        inputTokens,
        outputTokens,
      },
    });

    // 2. Update legacy ai_usage table (for backward compatibility)
    const existing = await db.query.ai_usage.findFirst({
      where: and(
        eq(ai_usage.userId, userId),
        eq(ai_usage.feature, feature),
        gte(ai_usage.periodStart, periodStart),
        lte(ai_usage.periodEnd, periodEnd)
      ),
    });

    if (existing) {
      // Update existing record
      await db
        .update(ai_usage)
        .set({
          requestCount: (existing.requestCount || 0) + 1,
          cost: String(Number(existing.cost || 0) + cost),
          updatedAt: now,
        })
        .where(eq(ai_usage.id, existing.id));
    } else {
      // Create new record
      await db.insert(ai_usage).values({
        userId,
        organizationId,
        feature,
        periodStart,
        periodEnd,
        requestCount: 1,
        cost: String(cost),
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(
      `[Cost Tracking] AI: ${feature} (${model}), ${inputTokens + outputTokens} tokens, $${cost.toFixed(4)} for user ${userId}`
    );
  } catch (error) {
    console.error('[Cost Tracking] Failed to track AI cost:', error);
  }
}

interface TrackStorageParams {
  userId: string;
  organizationId?: string;
  totalBytes: number;
  attachmentsBytes?: number;
  emailsBytes?: number;
}

/**
 * Track storage usage (call this periodically, e.g., daily via cron)
 */
export async function trackStorageCost({
  userId,
  organizationId,
  totalBytes,
  attachmentsBytes = 0,
  emailsBytes = 0,
}: TrackStorageParams) {
  try {
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    const includedGB = 50; // Free tier: 50GB
    const overageGB = Math.max(0, totalGB - includedGB);
    const cost = overageGB * PRICING.storage.perGB;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Check if usage record exists for this period
    const existing = await db.query.storage_usage.findFirst({
      where: and(
        eq(storage_usage.userId, userId),
        gte(storage_usage.periodStart, periodStart),
        lte(storage_usage.periodEnd, periodEnd)
      ),
    });

    if (existing) {
      // Update existing record (take the latest snapshot)
      await db
        .update(storage_usage)
        .set({
          storageUsed: totalBytes,
          attachmentsBytes,
          emailsBytes,
          overageGb: String(overageGB),
          cost: String(cost),
          snapshotDate: now,
          updatedAt: now,
        })
        .where(eq(storage_usage.id, existing.id));
    } else {
      // Create new record
      await db.insert(storage_usage).values({
        userId,
        organizationId,
        periodStart,
        periodEnd,
        storageUsed: totalBytes,
        attachmentsBytes,
        emailsBytes,
        includedGb: String(includedGB),
        overageGb: String(overageGB),
        cost: String(cost),
        snapshotDate: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(
      `[Cost Tracking] Storage: ${totalGB.toFixed(2)}GB (${overageGB.toFixed(2)}GB overage), $${cost.toFixed(4)} for user ${userId}`
    );
  } catch (error) {
    console.error('[Cost Tracking] Failed to track storage cost:', error);
  }
}

/**
 * Calculate actual Twilio cost from webhook data
 * Twilio includes the actual price in their status callbacks
 */
export function calculateTwilioCost(price: string | number | undefined, numSegments: number = 1): number {
  if (price) {
    return typeof price === 'string' ? parseFloat(price) : price;
  }
  // Fallback to estimate if price not available
  return numSegments * PRICING.sms.perMessage;
}

/**
 * Calculate AI cost from OpenAI/Anthropic API response
 */
export function calculateAICostFromUsage(usage: any, model: string): number {
  if (!usage || !usage.prompt_tokens || !usage.completion_tokens) {
    return 0;
  }

  const inputTokens = usage.prompt_tokens;
  const outputTokens = usage.completion_tokens;

  if (model.includes('gpt-4')) {
    return inputTokens * PRICING.ai.gpt4.inputTokens + outputTokens * PRICING.ai.gpt4.outputTokens;
  } else if (model.includes('gpt-3.5')) {
    return inputTokens * PRICING.ai.gpt35.inputTokens + outputTokens * PRICING.ai.gpt35.outputTokens;
  } else if (model.includes('claude')) {
    return inputTokens * PRICING.ai.claude.inputTokens + outputTokens * PRICING.ai.claude.outputTokens;
  }

  return 0;
}
