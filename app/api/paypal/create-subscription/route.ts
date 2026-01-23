import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, paypalBillingPlans } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPayPalClient } from '@/lib/paypal/client';

export const dynamic = 'force-dynamic';

interface CreateSubscriptionRequest {
  planId: 'free' | 'individual' | 'team' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  seats?: number;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * POST /api/paypal/create-subscription
 * Create a PayPal subscription for a user
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

    const body: CreateSubscriptionRequest = await request.json();
    const { planId, billingCycle, seats = 1, successUrl, cancelUrl } = body;

    // Free plan doesn't need checkout
    if (planId === 'free') {
      return NextResponse.json(
        { error: 'Free plan does not require subscription' },
        { status: 400 }
      );
    }

    // Enterprise requires sales contact
    if (planId === 'enterprise') {
      return NextResponse.json(
        { error: 'Enterprise plan requires sales contact' },
        { status: 400 }
      );
    }

    // Get PayPal billing plan from database
    const paypalPlan = await db.query.paypalBillingPlans.findFirst({
      where: and(
        eq(paypalBillingPlans.planId, planId),
        eq(paypalBillingPlans.billingCycle, billingCycle)
      ),
    });

    if (!paypalPlan) {
      return NextResponse.json(
        { error: `PayPal plan not configured for ${planId} ${billingCycle}. Please contact support.` },
        { status: 404 }
      );
    }

    // Create PayPal subscription
    const paypal = getPayPalClient();

    const subscription = await paypal.createSubscription({
      plan_id: paypalPlan.paypalPlanId,
      quantity: seats.toString(),
      subscriber: {
        email_address: user.email!,
        name: {
          given_name: dbUser.fullName?.split(' ')[0] || 'User',
          surname: dbUser.fullName?.split(' ').slice(1).join(' ') || '',
        },
      },
      application_context: {
        brand_name: 'EaseMail',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      },
      custom_id: dbUser.id, // Store user ID for webhook processing
    });

    // Find approval link
    const approvalLink = subscription.links.find(link => link.rel === 'approve');

    if (!approvalLink) {
      throw new Error('PayPal did not return an approval link');
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      approvalUrl: approvalLink.href,
      status: subscription.status,
    });
  } catch (error) {
    console.error('[PayPal] Error creating subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to create PayPal subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
