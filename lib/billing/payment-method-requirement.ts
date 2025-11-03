/**
 * Payment Method Requirement Checker
 * 
 * Utilities for checking if users need payment methods on file
 * and enforcing payment method requirements.
 */

import { db } from '@/lib/db/drizzle';
import { users, paymentMethods, paymentMethodRequirements } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendPaymentMethodRequiredEmail } from './email-notifications';

/**
 * Check if a user requires a payment method
 * 
 * Rules:
 * - Promo users: NO payment method required
 * - Free tier users: NO payment method required
 * - Paid tier users: YES payment method required
 */
export async function checkPaymentMethodRequirement(userId: string): Promise<{
  required: boolean;
  reason?: string;
  hasPaymentMethod: boolean;
  user: any;
}> {
  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user has active payment methods
  const paymentMethodsList = await db.select()
    .from(paymentMethods)
    .where(
      and(
        eq(paymentMethods.userId, userId),
        eq(paymentMethods.status, 'active')
      )
    );

  const hasPaymentMethod = paymentMethodsList.length > 0;

  // Promo users don't need payment methods
  if (user.isPromoUser) {
    return {
      required: false,
      reason: 'promo_user',
      hasPaymentMethod,
      user,
    };
  }

  // Free tier users don't need payment methods
  if (user.subscriptionTier === 'free') {
    return {
      required: false,
      reason: 'free_tier',
      hasPaymentMethod,
      user,
    };
  }

  // All other tiers require payment methods
  return {
    required: true,
    reason: 'subscription_tier',
    hasPaymentMethod,
    user,
  };
}

/**
 * Enforce payment method requirement
 * Creates or updates a payment method requirement record
 */
export async function enforcePaymentMethodRequirement(
  userId: string,
  gracePeriodDays: number = 3
): Promise<void> {
  const check = await checkPaymentMethodRequirement(userId);

  if (!check.required) {
    // User doesn't need payment method, remove any existing requirement
    await db.delete(paymentMethodRequirements)
      .where(eq(paymentMethodRequirements.userId, userId));
    return;
  }

  if (check.hasPaymentMethod) {
    // User has payment method, remove any existing requirement
    await db.delete(paymentMethodRequirements)
      .where(eq(paymentMethodRequirements.userId, userId));
    return;
  }

  // User needs payment method but doesn't have one
  const enforceAfter = new Date();
  enforceAfter.setDate(enforceAfter.getDate() + gracePeriodDays);

  // Check if requirement already exists
  const existing = await db.query.paymentMethodRequirements.findFirst({
    where: eq(paymentMethodRequirements.userId, userId),
  });

  if (existing) {
    // Update existing requirement
    await db.update(paymentMethodRequirements)
      .set({
        requiresPaymentMethod: true,
        reason: check.reason,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethodRequirements.userId, userId));
  } else {
    // Create new requirement
    await db.insert(paymentMethodRequirements).values({
      userId,
      requiresPaymentMethod: true,
      reason: check.reason,
      enforceAfter,
    });
  }
}

/**
 * Notify user about payment method requirement
 */
export async function notifyPaymentMethodRequired(userId: string): Promise<void> {
  const requirement = await db.query.paymentMethodRequirements.findFirst({
    where: eq(paymentMethodRequirements.userId, userId),
  });

  if (!requirement || !requirement.requiresPaymentMethod) {
    return;
  }

  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !requirement.enforceAfter) {
    return;
  }

  // Calculate grace period days
  const gracePeriodDays = Math.ceil((requirement.enforceAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Send email notification
  try {
    await sendPaymentMethodRequiredEmail({
      userEmail: user.email,
      userName: user.fullName || user.email.split('@')[0],
      subscriptionTier: user.subscriptionTier || 'paid',
      enforceAfter: requirement.enforceAfter,
      gracePeriodDays: Math.max(gracePeriodDays, 0),
    });

    // Update notification tracking
    await db.update(paymentMethodRequirements)
      .set({
        lastNotifiedAt: new Date(),
        notificationCount: (requirement.notificationCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethodRequirements.userId, userId));

    console.log(`📧 Payment method required notification sent to user ${userId}`);
  } catch (error) {
    console.error('Failed to send payment method notification:', error);
  }
}

/**
 * Suspend user for missing payment method
 */
export async function suspendForMissingPaymentMethod(userId: string): Promise<void> {
  // Update user status
  await db.update(users)
    .set({
      suspended: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Update requirement
  await db.update(paymentMethodRequirements)
    .set({
      suspendedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(paymentMethodRequirements.userId, userId));

  console.log(`⚠️ User ${userId} suspended for missing payment method`);
}

/**
 * Check and enforce payment method requirements for all users
 * This should be run periodically (e.g., daily)
 */
export async function enforceAllPaymentMethodRequirements(): Promise<{
  checked: number;
  requirementsCreated: number;
  notificationsSent: number;
  suspended: number;
}> {
  const allUsers = await db.select().from(users);
  
  let requirementsCreated = 0;
  let notificationsSent = 0;
  let suspended = 0;

  for (const user of allUsers) {
    try {
      const check = await checkPaymentMethodRequirement(user.id);

      if (check.required && !check.hasPaymentMethod) {
        // Enforce requirement
        await enforcePaymentMethodRequirement(user.id);
        requirementsCreated++;

        // Check if grace period has passed
        const requirement = await db.query.paymentMethodRequirements.findFirst({
          where: eq(paymentMethodRequirements.userId, user.id),
        });

        if (requirement && requirement.enforceAfter) {
          const now = new Date();
          if (now > requirement.enforceAfter && !requirement.suspendedAt) {
            // Grace period passed, suspend user
            await suspendForMissingPaymentMethod(user.id);
            suspended++;
          } else if (now < requirement.enforceAfter) {
            // Still in grace period, send notification
            const daysSinceLastNotification = requirement.lastNotifiedAt
              ? (now.getTime() - requirement.lastNotifiedAt.getTime()) / (1000 * 60 * 60 * 24)
              : 999;

            // Send notification once per day
            if (daysSinceLastNotification > 1) {
              await notifyPaymentMethodRequired(user.id);
              notificationsSent++;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error enforcing payment method requirement for user ${user.id}:`, error);
    }
  }

  return {
    checked: allUsers.length,
    requirementsCreated,
    notificationsSent,
    suspended,
  };
}

