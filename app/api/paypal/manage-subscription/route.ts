import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPayPalClient } from '@/lib/paypal/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/paypal/manage-subscription
 * Get subscription details and management URL for PayPal
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get PayPal subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, dbUser.id),
    });

    if (!subscription || !subscription.paypalSubscriptionId) {
      return NextResponse.json(
        { error: 'No PayPal subscription found. Please subscribe to a plan first.' },
        { status: 404 }
      );
    }

    // Get subscription details from PayPal
    const paypal = getPayPalClient();
    const paypalSubscription = await paypal.getSubscription(subscription.paypalSubscriptionId);

    // PayPal doesn't have a customer portal like Stripe
    // Users manage subscriptions directly through PayPal
    // Find the subscription management link
    const manageLink = paypalSubscription.links.find(link => link.rel === 'edit');

    return NextResponse.json({
      success: true,
      subscription: {
        id: paypalSubscription.id,
        status: paypalSubscription.status,
        planId: subscription.planId,
        planName: subscription.planName,
        billingCycle: subscription.billingCycle,
        seats: subscription.seats,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        nextBillingTime: paypalSubscription.billing_info?.next_billing_time,
        lastPayment: paypalSubscription.billing_info?.last_payment,
      },
      manageUrl: manageLink?.href || 'https://www.paypal.com/myaccount/autopay/',
      message: 'To manage your subscription, visit PayPal directly',
    });
  } catch (error) {
    console.error('[PayPal] Error getting subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to get subscription details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/paypal/manage-subscription
 * Cancel or modify subscription
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { action, reason } = body;

    // Get PayPal subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, dbUser.id),
    });

    if (!subscription || !subscription.paypalSubscriptionId) {
      return NextResponse.json(
        { error: 'No PayPal subscription found' },
        { status: 404 }
      );
    }

    const paypal = getPayPalClient();

    switch (action) {
      case 'cancel':
        await paypal.cancelSubscription(subscription.paypalSubscriptionId, reason);
        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled successfully',
        });

      case 'suspend':
        await paypal.suspendSubscription(subscription.paypalSubscriptionId, reason);
        return NextResponse.json({
          success: true,
          message: 'Subscription suspended successfully',
        });

      case 'activate':
        await paypal.activateSubscription(subscription.paypalSubscriptionId, reason);
        return NextResponse.json({
          success: true,
          message: 'Subscription activated successfully',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: cancel, suspend, or activate' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[PayPal] Error managing subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to manage subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
