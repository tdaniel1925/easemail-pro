/**
 * Pro-Rating Service
 * 
 * Handles pro-rated billing for mid-month signups and subscription changes
 */

import { db } from '@/lib/db';
import { subscriptions, subscriptionPeriods } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export interface ProRatedCharge {
  amount: number;
  isProRated: boolean;
  fullPrice: number;
  daysUsed: number;
  totalDays: number;
  proRatePercentage?: number;
}

export interface Subscription {
  id: string;
  userId?: string;
  organizationId?: string;
  planPrice: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingCycle?: string;
}

/**
 * Calculate pro-rated charge for a subscription period
 */
export function calculateProRatedCharge(
  subscription: Subscription,
  periodStart: Date,
  periodEnd: Date
): ProRatedCharge {
  const subscriptionStart = subscription.currentPeriodStart;
  const planPrice = subscription.planPrice;
  
  // Full month if started before or at period start
  if (subscriptionStart <= periodStart) {
    const daysInMonth = getDaysInMonth(periodStart);
    return {
      amount: planPrice,
      isProRated: false,
      fullPrice: planPrice,
      daysUsed: daysInMonth,
      totalDays: daysInMonth,
    };
  }
  
  // Pro-rate if started mid-period
  const totalDays = getDaysBetween(periodStart, periodEnd) + 1; // Include both start and end day
  const daysUsed = getDaysBetween(subscriptionStart, periodEnd) + 1;
  const proRatedAmount = (planPrice / totalDays) * daysUsed;
  
  return {
    amount: Number(proRatedAmount.toFixed(2)),
    isProRated: true,
    fullPrice: planPrice,
    daysUsed,
    totalDays,
    proRatePercentage: (daysUsed / totalDays) * 100,
  };
}

/**
 * Track a subscription period for billing
 */
export async function createSubscriptionPeriod(
  subscription: Subscription,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  const proRated = calculateProRatedCharge(subscription, periodStart, periodEnd);
  
  await db.insert(subscriptionPeriods).values({
    subscriptionId: subscription.id,
    userId: subscription.userId || null,
    organizationId: subscription.organizationId || null,
    periodStart,
    periodEnd,
    isProRated: proRated.isProRated,
    daysInPeriod: proRated.daysUsed,
    daysInFullMonth: proRated.totalDays,
    basePrice: subscription.planPrice.toFixed(2),
    proRatedPrice: proRated.amount.toFixed(2),
  });
  
  console.log(
    `[ProRating] Created period for subscription ${subscription.id}: ` +
    `${proRated.isProRated ? 'Pro-rated' : 'Full'} $${proRated.amount}`
  );
}

/**
 * Get unbilled subscription periods
 */
export async function getUnbilledSubscriptionPeriods(params: {
  userId?: string;
  organizationId?: string;
  periodStart: Date;
  periodEnd: Date;
}): Promise<Array<{
  id: string;
  subscriptionId: string;
  isProRated: boolean;
  daysInPeriod: number;
  daysInFullMonth: number;
  basePrice: string;
  proRatedPrice: string;
  periodStart: Date;
  periodEnd: Date;
}>> {
  const { userId, organizationId, periodStart, periodEnd } = params;
  
  const conditions = [
    isNull(subscriptionPeriods.billedAt),
    and(
      eq(subscriptionPeriods.periodStart, periodStart),
      eq(subscriptionPeriods.periodEnd, periodEnd)
    ),
  ];
  
  if (userId) {
    conditions.push(eq(subscriptionPeriods.userId, userId));
  }
  
  if (organizationId) {
    conditions.push(eq(subscriptionPeriods.organizationId, organizationId));
  }
  
  return await db
    .select()
    .from(subscriptionPeriods)
    .where(and(...conditions));
}

/**
 * Mark subscription periods as billed
 */
export async function markSubscriptionPeriodsBilled(
  periodIds: string[],
  invoiceId: string
): Promise<void> {
  if (periodIds.length === 0) return;
  
  for (const periodId of periodIds) {
    await db
      .update(subscriptionPeriods)
      .set({
        invoiceId,
        billedAt: new Date(),
      })
      .where(eq(subscriptionPeriods.id, periodId));
  }
  
  console.log(`[ProRating] Marked ${periodIds.length} periods as billed to invoice ${invoiceId}`);
}

/**
 * Get number of days in a month
 */
function getDaysInMonth(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth();
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get number of days between two dates (inclusive)
 */
function getDaysBetween(start: Date, end: Date): number {
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const diffTime = Math.abs(endTime - startTime);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculate pro-rated refund for subscription cancellation
 */
export function calculateProRatedRefund(
  subscription: Subscription,
  cancellationDate: Date
): number {
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;
  const planPrice = subscription.planPrice;
  
  // If cancelled before period start, full refund
  if (cancellationDate < periodStart) {
    return planPrice;
  }
  
  // If cancelled after period end, no refund
  if (cancellationDate > periodEnd) {
    return 0;
  }
  
  // Calculate unused days
  const totalDays = getDaysBetween(periodStart, periodEnd) + 1;
  const unusedDays = getDaysBetween(cancellationDate, periodEnd);
  const refundAmount = (planPrice / totalDays) * unusedDays;
  
  return Number(refundAmount.toFixed(2));
}

/**
 * Format pro-rated charge description for invoice
 */
export function formatProRatedDescription(
  planName: string,
  proRated: ProRatedCharge
): string {
  if (!proRated.isProRated) {
    return `${planName} Plan`;
  }
  
  return `${planName} Plan (Pro-rated: ${proRated.daysUsed}/${proRated.totalDays} days)`;
}

/**
 * Calculate next billing date based on billing cycle
 */
export function calculateNextBillingDate(
  currentBillingDate: Date,
  billingCycle: 'monthly' | 'annual'
): Date {
  const nextBilling = new Date(currentBillingDate);
  
  if (billingCycle === 'monthly') {
    nextBilling.setMonth(nextBilling.getMonth() + 1);
  } else {
    nextBilling.setFullYear(nextBilling.getFullYear() + 1);
  }
  
  // Handle edge cases (e.g., Jan 31 -> Feb 28/29)
  if (nextBilling.getDate() !== currentBillingDate.getDate()) {
    nextBilling.setDate(0); // Set to last day of previous month
  }
  
  return nextBilling;
}

/**
 * Check if a subscription should be pro-rated
 */
export function shouldProRate(
  subscriptionStart: Date,
  billingPeriodStart: Date
): boolean {
  return subscriptionStart > billingPeriodStart;
}

/**
 * Get billing period start date (1st of month)
 */
export function getBillingPeriodStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get billing period end date (last day of month)
 */
export function getBillingPeriodEnd(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

