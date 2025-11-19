/**
 * Enhanced Cost Tracker
 * 
 * Unified cost tracking system for all services (OpenAI, SMS, Storage, Whisper, etc.)
 * Tracks costs per user/organization with proper billing attribution
 */

import { db } from '@/lib/db';
import { costEntries, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type ServiceType = 'openai' | 'sms' | 'storage' | 'whisper' | 'stripe_fee';

export interface TrackCostParams {
  userId: string;
  organizationId?: string;
  service: ServiceType;
  feature?: string;
  costUsd: number;
  quantity?: number;
  unit?: string;
  metadata?: Record<string, any>;
}

/**
 * Track a cost entry for billing
 */
export async function trackCost(params: TrackCostParams): Promise<void> {
  const {
    userId,
    organizationId,
    service,
    feature,
    costUsd,
    quantity,
    unit,
    metadata
  } = params;
  
  try {
    // Get user to determine billing attribution
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user) {
      console.error(`[CostTracker] User not found: ${userId}`);
      return;
    }
    
    // Determine if cost should be billed to organization
    const billableToOrg = !!user.organizationId;
    const orgId = billableToOrg ? user.organizationId : organizationId;
    
    // Get current billing period
    const period = getCurrentBillingPeriod();
    
    // Insert cost entry
    await db.insert(costEntries).values({
      userId,
      organizationId: orgId || null,
      service,
      feature: feature || null,
      costUsd: costUsd.toFixed(4),
      quantity: quantity ? quantity.toFixed(2) : null,
      unit: unit || null,
      billableToOrg,
      periodStart: period.start,
      periodEnd: period.end,
      occurredAt: new Date(),
      metadata: metadata || null,
    });
    
    console.log(`[CostTracker] Tracked ${service} cost: $${costUsd} for user ${userId}`);
  } catch (error) {
    console.error('[CostTracker] Error tracking cost:', error);
    // Don't throw - we don't want cost tracking to break the main flow
  }
}

/**
 * Get current billing period (monthly)
 */
function getCurrentBillingPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get billing period for a specific date
 */
export function getBillingPeriodForDate(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Get last month's billing period
 */
export function getLastMonthPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  return getBillingPeriodForDate(lastMonth);
}

/**
 * Track OpenAI API cost
 */
export async function trackOpenAICost(params: {
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  feature?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { userId, model, promptTokens, completionTokens, feature, metadata } = params;
  
  // Calculate cost based on model pricing
  const cost = calculateOpenAICost(model, promptTokens, completionTokens);
  const totalTokens = promptTokens + completionTokens;
  
  await trackCost({
    userId,
    service: 'openai',
    feature,
    costUsd: cost,
    quantity: totalTokens,
    unit: 'tokens',
    metadata: {
      model,
      promptTokens,
      completionTokens,
      ...metadata,
    },
  });
}

/**
 * Track SMS cost
 */
export async function trackSMSCost(params: {
  userId: string;
  messageCount: number;
  costPerMessage: number;
  feature?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { userId, messageCount, costPerMessage, feature, metadata } = params;
  
  const totalCost = messageCount * costPerMessage;
  
  await trackCost({
    userId,
    service: 'sms',
    feature,
    costUsd: totalCost,
    quantity: messageCount,
    unit: 'messages',
    metadata,
  });
}

/**
 * Track Whisper (transcription) cost
 */
export async function trackWhisperCost(params: {
  userId: string;
  durationMinutes: number;
  feature?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { userId, durationMinutes, feature, metadata } = params;
  
  // Whisper pricing: $0.006 per minute
  const costPerMinute = 0.006;
  const totalCost = durationMinutes * costPerMinute;
  
  await trackCost({
    userId,
    service: 'whisper',
    feature: feature || 'dictation',
    costUsd: totalCost,
    quantity: durationMinutes,
    unit: 'minutes',
    metadata,
  });
}

/**
 * Track storage cost
 */
export async function trackStorageCost(params: {
  userId: string;
  storageGB: number;
  feature?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { userId, storageGB, feature, metadata } = params;
  
  // Storage pricing: $0.10 per GB per month
  const costPerGB = 0.10;
  const totalCost = storageGB * costPerGB;
  
  await trackCost({
    userId,
    service: 'storage',
    feature: feature || 'attachment_storage',
    costUsd: totalCost,
    quantity: storageGB,
    unit: 'gb',
    metadata,
  });
}

/**
 * Track Stripe fee
 */
export async function trackStripeFee(params: {
  userId: string;
  amount: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { userId, amount, metadata } = params;
  
  // Stripe fee: 2.9% + $0.30
  const stripeFee = (amount * 0.029) + 0.30;
  
  await trackCost({
    userId,
    service: 'stripe_fee',
    feature: 'payment_processing',
    costUsd: stripeFee,
    quantity: 1,
    unit: 'transaction',
    metadata,
  });
}

/**
 * Calculate OpenAI cost based on model and token usage
 */
function calculateOpenAICost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Pricing per 1M tokens (as of 2024)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4o': { prompt: 2.50, completion: 10.00 },
    'gpt-4o-mini': { prompt: 0.150, completion: 0.600 },
    'gpt-4-turbo': { prompt: 10.00, completion: 30.00 },
    'gpt-4': { prompt: 30.00, completion: 60.00 },
    'gpt-3.5-turbo': { prompt: 0.50, completion: 1.50 },
    'o1-preview': { prompt: 15.00, completion: 60.00 },
    'o1-mini': { prompt: 3.00, completion: 12.00 },
  };
  
  const modelPricing = pricing[model] || pricing['gpt-4o']; // Default to gpt-4o
  
  const promptCost = (promptTokens / 1_000_000) * modelPricing.prompt;
  const completionCost = (completionTokens / 1_000_000) * modelPricing.completion;
  
  return promptCost + completionCost;
}

/**
 * Get cost summary for a user/org in a billing period
 */
export async function getCostSummary(params: {
  userId?: string;
  organizationId?: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<{
  totalCost: number;
  byService: Record<ServiceType, number>;
  byFeature: Record<string, number>;
  count: number;
}> {
  const { userId, organizationId, periodStart, periodEnd } = params;
  
  // Build query conditions
  const conditions = [];
  if (userId) conditions.push(eq(costEntries.userId, userId));
  if (organizationId) conditions.push(eq(costEntries.organizationId, organizationId));
  
  const entries = await db
    .select()
    .from(costEntries)
    .where(and(
      ...conditions,
      gte(costEntries.periodStart, periodStart),
      lte(costEntries.periodEnd, periodEnd)
    ));
  
  const totalCost = entries.reduce((sum, entry) => sum + parseFloat(entry.costUsd || '0'), 0);
  
  const byService = entries.reduce((acc, entry) => {
    const service = entry.service as ServiceType;
    acc[service] = (acc[service] || 0) + parseFloat(entry.costUsd || '0');
    return acc;
  }, {} as Record<ServiceType, number>);
  
  const byFeature = entries.reduce((acc, entry) => {
    const feature = entry.feature || 'unknown';
    acc[feature] = (acc[feature] || 0) + parseFloat(entry.costUsd || '0');
    return acc;
  }, {} as Record<string, number>);
  
  return {
    totalCost,
    byService,
    byFeature,
    count: entries.length,
  };
}

// Import missing functions
import { and, gte, lte } from 'drizzle-orm';

