/**
 * AI Usage Tracking System
 * Tracks AI feature usage for billing calculations
 */

import { db } from '@/lib/db/drizzle';
import { aiUsage } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export type AIFeature = 'summarize' | 'write' | 'transcribe' | 'remix' | 'dictation';

interface AIUsageParams {
  userId: string;
  organizationId?: string;
  feature: AIFeature;
  requestCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Track AI usage for a feature
 */
export async function trackAIUsage(params: AIUsageParams) {
  const { userId, organizationId, feature, requestCount = 1, metadata } = params;
  
  // Get current month period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Check if record exists for this period
  const existing = await db.query.aiUsage.findFirst({
    where: and(
      eq(aiUsage.userId, userId),
      eq(aiUsage.feature, feature),
      gte(aiUsage.periodStart, periodStart),
      lte(aiUsage.periodEnd, periodEnd)
    ),
  });
  
  if (existing) {
    // Update existing record
    const newCount = (existing.requestCount || 0) + requestCount;
    const { overage, cost } = calculateAIOverage(newCount);
    
    await db.update(aiUsage)
      .set({
        requestCount: newCount,
        overageRequests: overage,
        totalCostUsd: cost.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(aiUsage.id, existing.id));
  } else {
    // Create new record
    const { overage, cost } = calculateAIOverage(requestCount);
    
    await db.insert(aiUsage).values({
      userId,
      organizationId,
      feature,
      requestCount,
      periodStart,
      periodEnd,
      includedRequests: Math.min(requestCount, 1000),
      overageRequests: overage,
      totalCostUsd: cost.toFixed(2),
      metadata: metadata as any,
    });
  }
}

/**
 * Calculate AI overage and cost
 * Free tier: 1000 requests/month
 * Overage: $0.001 per request
 */
function calculateAIOverage(totalRequests: number) {
  const includedRequests = 1000;
  const overageRate = 0.001;
  
  const overage = Math.max(0, totalRequests - includedRequests);
  const cost = overage * overageRate;
  
  return { overage, cost };
}

/**
 * Get AI usage for a user/org in a period
 */
export async function getAIUsage(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  organizationId?: string
) {
  const records = await db.query.aiUsage.findMany({
    where: and(
      eq(aiUsage.userId, userId),
      gte(aiUsage.periodStart, periodStart),
      lte(aiUsage.periodEnd, periodEnd)
    ),
  });
  
  // Aggregate by feature
  const byFeature: Record<string, {
    requests: number;
    included: number;
    overage: number;
    cost: number;
  }> = {};
  
  records.forEach(record => {
    const feature = record.feature;
    if (!byFeature[feature]) {
      byFeature[feature] = {
        requests: 0,
        included: 0,
        overage: 0,
        cost: 0,
      };
    }
    
    byFeature[feature].requests += record.requestCount || 0;
    byFeature[feature].included += record.includedRequests || 0;
    byFeature[feature].overage += record.overageRequests || 0;
    byFeature[feature].cost += parseFloat(record.totalCostUsd || '0');
  });
  
  const totalRequests = records.reduce((sum, r) => sum + (r.requestCount || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + parseFloat(r.totalCostUsd || '0'), 0);
  
  return {
    byFeature,
    totalRequests,
    totalCost,
    records,
  };
}

/**
 * Get AI usage summary for organization (all users)
 */
export async function getOrganizationAIUsage(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const records = await db.select().from(aiUsage).where(
    and(
      eq(aiUsage.organizationId, organizationId),
      gte(aiUsage.periodStart, periodStart),
      lte(aiUsage.periodEnd, periodEnd)
    )
  );
  
  // Aggregate by user and feature
  const byUser: Record<string, {
    userId: string;
    totalRequests: number;
    totalCost: number;
    byFeature: Record<string, number>;
  }> = {};
  
  records.forEach(record => {
    const userId = record.userId;
    if (!byUser[userId]) {
      byUser[userId] = {
        userId,
        totalRequests: 0,
        totalCost: 0,
        byFeature: {},
      };
    }
    
    byUser[userId].totalRequests += record.requestCount || 0;
    byUser[userId].totalCost += parseFloat(record.totalCostUsd || '0');
    byUser[userId].byFeature[record.feature] = (byUser[userId].byFeature[record.feature] || 0) + (record.requestCount || 0);
  });
  
  const totalRequests = records.reduce((sum, r) => sum + (r.requestCount || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + parseFloat(r.totalCostUsd || '0'), 0);
  
  return {
    byUser: Object.values(byUser),
    totalRequests,
    totalCost,
  };
}

/**
 * Get current month AI usage
 */
export async function getCurrentMonthAIUsage(userId: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  return getAIUsage(userId, periodStart, periodEnd);
}

/**
 * Check if user is within AI usage limits
 */
export async function checkAIUsageLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const usage = await getCurrentMonthAIUsage(userId);
  const limit = 1000; // Free tier limit (TODO: Get from user's plan)
  const used = usage.totalRequests;
  const remaining = Math.max(0, limit - used);
  
  return {
    allowed: used < limit || true, // Allow overage but charge for it
    used,
    limit,
    remaining,
  };
}

