import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const dynamic = 'force-dynamic';

interface CreateCheckoutSessionRequest {
  planId: 'free' | 'individual' | 'team' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  seats?: number;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout session for subscription
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

    const body: CreateCheckoutSessionRequest = await request.json();
    const { planId, billingCycle, seats = 1, successUrl, cancelUrl } = body;

    // Free plan doesn't need checkout
    if (planId === 'free') {
      return NextResponse.json(
        { error: 'Free plan does not require checkout' },
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

    // Calculate pricing
    const pricing = {
      individual: {
        monthly: 45.00,
        annual: 36.00,
      },
      team: {
        monthly: 40.50,
        annual: 32.40,
      },
    };

    const pricePerSeat = pricing[planId][billingCycle];
    const totalAmount = pricePerSeat * seats;

    // Create or retrieve Stripe customer
    // Check if user has an existing subscription with a Stripe customer ID
    const existingSubscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, dbUser.id),
    });

    let customerId = existingSubscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: dbUser.fullName || undefined,
        metadata: {
          userId: dbUser.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `EaseMail ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
              description: `${billingCycle === 'monthly' ? 'Monthly' : 'Annual'} subscription${planId === 'team' ? ` (${seats} seats)` : ''}`,
            },
            unit_amount: Math.round(pricePerSeat * 100), // Convert to cents
            recurring: {
              interval: billingCycle === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: seats,
        },
      ],
      metadata: {
        userId: dbUser.id,
        planId,
        billingCycle,
        seats: seats.toString(),
      },
      subscription_data: {
        metadata: {
          userId: dbUser.id,
          planId,
          billingCycle,
          seats: seats.toString(),
        },
        trial_period_days: 14, // 14-day free trial
      },
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
