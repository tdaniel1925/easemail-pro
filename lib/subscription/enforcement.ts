/**
 * HIGH PRIORITY FIX: Subscription Enforcement
 *
 * Checks subscription plan limits and enforces them across the application.
 * Prevents users from exceeding their plan limits and prompts for upgrades.
 */

import { db } from '@/lib/db/drizzle';
import { subscriptions, users, organizations, smsUsage, aiUsage, storageUsage, emailAccounts, organizationMembers } from '@/lib/db/schema';
import { eq, and, gte, lte, sum, sql } from 'drizzle-orm';

/**
 * Plan limits for each tier
 */
export const PLAN_LIMITS = {
  free: {
    emailAccounts: 1,
    emailSendsPerMonth: 50,
    smsPerMonth: 0,
    aiRequestsPerMonth: 10,
    storageGB: 1,
    teamMembers: 1,
    calendars: 1,
  },
  starter: {
    emailAccounts: 3,
    emailSendsPerMonth: 1000,
    smsPerMonth: 100,
    aiRequestsPerMonth: 100,
    storageGB: 5,
    teamMembers: 3,
    calendars: 3,
  },
  pro: {
    emailAccounts: 10,
    emailSendsPerMonth: 10000,
    smsPerMonth: 1000,
    aiRequestsPerMonth: 1000,
    storageGB: 50,
    teamMembers: 10,
    calendars: 10,
  },
  enterprise: {
    emailAccounts: -1, // unlimited
    emailSendsPerMonth: -1, // unlimited
    smsPerMonth: -1, // unlimited
    aiRequestsPerMonth: -1, // unlimited
    storageGB: -1, // unlimited
    teamMembers: -1, // unlimited
    calendars: -1, // unlimited
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
export type FeatureLimit = keyof typeof PLAN_LIMITS.free;

/**
 * Get user's current subscription tier
 */
export async function getUserPlan(userId: string): Promise<PlanTier> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return 'free';
  }

  // Check if user has active subscription
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, 'active')
    ),
  });

  if (subscription) {
    const planName = subscription.planName.toLowerCase();
    if (planName in PLAN_LIMITS) {
      return planName as PlanTier;
    }
  }

  // Fall back to user's subscriptionTier field
  const tier = (user.subscriptionTier || 'free').toLowerCase();
  return (tier in PLAN_LIMITS) ? tier as PlanTier : 'free';
}

/**
 * Get current usage for a user this month
 */
export async function getUserUsage(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Count email accounts
  const emailAccountCount = await db.select({ count: sql<number>`count(*)` })
    .from(emailAccounts)
    .where(eq(emailAccounts.userId, userId));

  // Count SMS this month
  const smsCount = await db.select({ total: sum(smsUsage.messageCount) })
    .from(smsUsage)
    .where(and(
      eq(smsUsage.userId, userId),
      gte(smsUsage.periodStart, startOfMonth)
    ));

  // Count AI requests this month
  const aiCount = await db.select({ count: sql<number>`count(*)` })
    .from(aiUsage)
    .where(and(
      eq(aiUsage.userId, userId),
      gte(aiUsage.createdAt, startOfMonth)
    ));

  // Get storage usage (in GB)
  const storage = await db.select({ total: sum(storageUsage.totalBytes) })
    .from(storageUsage)
    .where(eq(storageUsage.userId, userId));

  // Count team members (if user has org)
  const userOrg = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { organizationId: true },
  });

  let teamMemberCount = 1; // User themselves
  if (userOrg?.organizationId) {
    const members = await db.select({ count: sql<number>`count(*)` })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, userOrg.organizationId));
    teamMemberCount = Number(members[0]?.count || 1);
  }

  return {
    emailAccounts: Number(emailAccountCount[0]?.count || 0),
    smsThisMonth: Number(smsCount[0]?.total || 0),
    aiRequestsThisMonth: Number(aiCount[0]?.count || 0),
    storageGB: Number(storage[0]?.total || 0) / (1024 * 1024 * 1024), // Convert bytes to GB
    teamMembers: teamMemberCount,
    emailSendsThisMonth: 0, // TODO: Track email sends separately
  };
}

/**
 * Check if user can perform an action based on their plan limits
 */
export async function checkLimit(
  userId: string,
  feature: FeatureLimit,
  additionalAmount = 1
): Promise<{ allowed: boolean; current: number; limit: number; plan: PlanTier; upgradeRequired: boolean }> {
  const plan = await getUserPlan(userId);
  const limits = PLAN_LIMITS[plan];
  const usage = await getUserUsage(userId);

  // Map feature to usage key
  const usageMap: Record<FeatureLimit, number> = {
    emailAccounts: usage.emailAccounts,
    emailSendsPerMonth: usage.emailSendsThisMonth,
    smsPerMonth: usage.smsThisMonth,
    aiRequestsPerMonth: usage.aiRequestsThisMonth,
    storageGB: usage.storageGB,
    teamMembers: usage.teamMembers,
    calendars: usage.emailAccounts, // Assuming 1 calendar per account
  };

  const current = usageMap[feature];
  const limit = limits[feature];

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current, limit, plan, upgradeRequired: false };
  }

  const allowed = (current + additionalAmount) <= limit;

  return {
    allowed,
    current,
    limit,
    plan,
    upgradeRequired: !allowed,
  };
}

/**
 * Enforce limit before performing an action
 * Throws an error if limit is exceeded
 */
export async function enforceLimit(
  userId: string,
  feature: FeatureLimit,
  additionalAmount = 1
): Promise<void> {
  const check = await checkLimit(userId, feature, additionalAmount);

  if (!check.allowed) {
    const featureNames: Record<FeatureLimit, string> = {
      emailAccounts: 'email accounts',
      emailSendsPerMonth: 'emails per month',
      smsPerMonth: 'SMS messages per month',
      aiRequestsPerMonth: 'AI requests per month',
      storageGB: 'GB of storage',
      teamMembers: 'team members',
      calendars: 'calendars',
    };

    throw new Error(
      `${featureNames[feature]} limit reached. You're on the ${check.plan} plan with a limit of ${check.limit}. Upgrade to continue.`
    );
  }
}

/**
 * Get upgrade message for a specific feature
 */
export function getUpgradeMessage(
  currentPlan: PlanTier,
  feature: FeatureLimit,
  current: number,
  limit: number
): string {
  const featureNames: Record<FeatureLimit, string> = {
    emailAccounts: 'email account',
    emailSendsPerMonth: 'email send',
    smsPerMonth: 'SMS',
    aiRequestsPerMonth: 'AI request',
    storageGB: 'GB storage',
    teamMembers: 'team member',
    calendars: 'calendar',
  };

  const recommendedPlans: Record<PlanTier, PlanTier | null> = {
    free: 'starter',
    starter: 'pro',
    pro: 'enterprise',
    enterprise: null,
  };

  const nextPlan = recommendedPlans[currentPlan];

  if (!nextPlan) {
    return `You're on the ${currentPlan} plan (${current}/${limit} ${featureNames[feature]}s used). Contact support for custom limits.`;
  }

  const nextLimit = PLAN_LIMITS[nextPlan][feature];
  const limitText = nextLimit === -1 ? 'unlimited' : nextLimit.toString();

  return `You've reached your ${featureNames[feature]} limit (${current}/${limit}). Upgrade to ${nextPlan} for ${limitText} ${featureNames[feature]}s.`;
}
