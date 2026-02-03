/**
 * Subscribe to Plan API
 * POST /api/billing/subscribe - Create PayPal subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { subscriptions, subscriptionPlans, users, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { paypalClient } from '@/lib/billing/paypal-client';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface SubscribeRequest {
  planSlug: string; // 'free', 'starter', 'pro', 'enterprise'
  billingCycle: 'monthly' | 'yearly';
  organizationId?: string; // Optional: subscribe for organization
}

/**
 * POST /api/billing/subscribe
 * Create a new PayPal subscription
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SubscribeRequest = await request.json();
    const { planSlug, billingCycle, organizationId } = body;

    // Validate input
    if (!planSlug || !billingCycle) {
      return NextResponse.json(
        { error: 'Plan slug and billing cycle are required' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be monthly or yearly' },
        { status: 400 }
      );
    }

    // Get plan details
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug))
      .limit(1);

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    if (!plan.isActive) {
      return NextResponse.json(
        { error: 'This plan is no longer available' },
        { status: 400 }
      );
    }

    // Check if subscribing for organization
    if (organizationId) {
      // Verify user has permission
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (!dbUser || dbUser.organizationId !== organizationId) {
        return NextResponse.json(
          { error: 'You do not have permission to manage this organization' },
          { status: 403 }
        );
      }

      if (!['org_admin', 'platform_admin'].includes(dbUser.role || '')) {
        return NextResponse.json(
          { error: 'Only organization admins can manage subscriptions' },
          { status: 403 }
        );
      }
    }

    // Check for existing active subscription
    const existingSubscriptions = await db.query.subscriptions.findMany({
      where: organizationId
        ? eq(subscriptions.organizationId, organizationId)
        : eq(subscriptions.userId, user.id),
    });

    const activeSubscription = existingSubscriptions.find(
      sub => ['active', 'pending'].includes(sub.status || '')
    );

    if (activeSubscription) {
      return NextResponse.json(
        {
          error: 'You already have an active subscription',
          currentSubscription: {
            id: activeSubscription.id,
            status: activeSubscription.status,
            planName: activeSubscription.planName,
          }
        },
        { status: 400 }
      );
    }

    // For free plan, just create subscription without PayPal
    if (planSlug === 'free') {
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          userId: organizationId ? null : user.id,
          organizationId: organizationId || null,
          planName: plan.name,
          planId: plan.slug,
          billingCycle,
          pricePerMonth: billingCycle === 'monthly' ? plan.monthlyPrice : null,
          seatsIncluded: (plan.limits as any)?.maxSeats || 1,
          status: 'active',
          paymentProvider: 'none',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        })
        .returning();

      logger.payment.info('Free subscription created', {
        userId: user.id,
        subscriptionId: newSubscription.id,
        planSlug,
      });

      return NextResponse.json({
        success: true,
        subscription: {
          id: newSubscription.id,
          status: 'active',
          planName: plan.name,
          billingCycle,
        },
      });
    }

    // For paid plans, we need PayPal subscription
    if (!plan.paypalPlanId) {
      return NextResponse.json(
        { error: 'PayPal integration not configured for this plan' },
        { status: 500 }
      );
    }

    // Create subscription in database (status: pending until PayPal approval)
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId: organizationId ? null : user.id,
        organizationId: organizationId || null,
        planName: plan.name,
        planId: plan.slug,
        billingCycle,
        pricePerMonth: billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice,
        seatsIncluded: (plan.limits as any)?.maxSeats || 1,
        status: 'pending',
        paymentProvider: 'paypal',
        paypalPlanId: plan.paypalPlanId,
      })
      .returning();

    logger.payment.info('Subscription created (pending PayPal approval)', {
      userId: user.id,
      subscriptionId: newSubscription.id,
      planSlug,
      billingCycle,
    });

    // Return subscription details + PayPal approval URL
    // In real implementation, you'd create PayPal subscription here and get approval URL
    return NextResponse.json({
      success: true,
      subscription: {
        id: newSubscription.id,
        status: 'pending',
        planName: plan.name,
        billingCycle,
      },
      // Frontend should redirect user to PayPal to complete subscription
      // For now, return the plan ID so frontend can use PayPal SDK
      paypal: {
        planId: plan.paypalPlanId,
        approvalUrl: null, // Will be generated by PayPal SDK on frontend
      },
    });
  } catch (error) {
    logger.payment.error('Failed to create subscription', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
