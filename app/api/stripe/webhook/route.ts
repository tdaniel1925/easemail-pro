import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { db } from '@/lib/db/drizzle';
import { users, subscriptions, invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events for subscription lifecycle
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('[Stripe Webhook] Event received:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * Called when a customer completes the checkout flow
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const billingCycle = session.metadata?.billingCycle as 'monthly' | 'annual';
  const seats = parseInt(session.metadata?.seats || '1');

  if (!userId || !planId) {
    console.error('[Stripe Webhook] Missing metadata in checkout session');
    return;
  }

  console.log('[Stripe Webhook] Checkout completed for user:', userId);

  // The subscription will be created in a separate event (customer.subscription.created)
  // This event is mainly for tracking the successful checkout
}

/**
 * Handle customer.subscription.created
 * Called when a new subscription is created
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const planId = subscription.metadata?.planId;
  const billingCycle = subscription.metadata?.billingCycle as 'monthly' | 'annual';
  const seats = parseInt(subscription.metadata?.seats || '1');

  if (!userId || !planId) {
    console.error('[Stripe Webhook] Missing metadata in subscription');
    return;
  }

  console.log('[Stripe Webhook] Creating subscription for user:', userId);

  // Determine if it's an organization subscription
  const isOrgSubscription = planId === 'team' || planId === 'enterprise';

  // Get user to find org_id if needed
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    console.error('[Stripe Webhook] User not found:', userId);
    return;
  }

  // Create or update subscription in database
  await db.insert(subscriptions).values({
    userId: isOrgSubscription ? null : userId,
    organizationId: isOrgSubscription ? user.organizationId : null,
    planId,
    planName: planId.charAt(0).toUpperCase() + planId.slice(1), // Capitalize first letter
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    seats,
    billingCycle,
    trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  }).onConflictDoUpdate({
    target: subscriptions.stripeSubscriptionId,
    set: {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      seats,
      billingCycle,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      updatedAt: new Date(),
    },
  });

  // Update user role if needed
  if (planId === 'individual' && user.role === 'user') {
    await db.update(users)
      .set({ role: 'individual' })
      .where(eq(users.id, userId));
  } else if (planId === 'team' && user.organizationId) {
    // User is part of a team, update to org_user if not already
    if (user.role === 'user') {
      await db.update(users)
        .set({ role: 'org_user' })
        .where(eq(users.id, userId));
    }
  }

  console.log('[Stripe Webhook] Subscription created successfully');
}

/**
 * Handle customer.subscription.updated
 * Called when a subscription is updated (plan change, cancellation, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in subscription metadata');
    return;
  }

  console.log('[Stripe Webhook] Updating subscription for user:', userId);

  const seats = parseInt(subscription.metadata?.seats || '1');
  const billingCycle = subscription.metadata?.billingCycle as 'monthly' | 'annual';

  // Update subscription in database
  await db.update(subscriptions)
    .set({
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      seats,
      billingCycle,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  // If subscription was canceled, update user role back to 'user'
  if (subscription.status === 'canceled') {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user && (user.role === 'individual' || user.role === 'org_user')) {
      await db.update(users)
        .set({ role: 'user' })
        .where(eq(users.id, userId));
    }
  }

  console.log('[Stripe Webhook] Subscription updated successfully');
}

/**
 * Handle customer.subscription.deleted
 * Called when a subscription is deleted/expired
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in subscription metadata');
    return;
  }

  console.log('[Stripe Webhook] Deleting subscription for user:', userId);

  // Mark subscription as canceled
  await db.update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  // Downgrade user to free plan
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user && (user.role === 'individual' || user.role === 'org_user')) {
    await db.update(users)
      .set({ role: 'user' })
      .where(eq(users.id, userId));
  }

  console.log('[Stripe Webhook] Subscription deleted successfully');
}

/**
 * Handle invoice.payment_succeeded
 * Called when an invoice payment succeeds
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId;

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in invoice');
    return;
  }

  console.log('[Stripe Webhook] Invoice payment succeeded for user:', userId);

  // Get user to find org_id if needed
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    console.error('[Stripe Webhook] User not found:', userId);
    return;
  }

  // Create invoice record in database
  await db.insert(invoices).values({
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_paid / 100, // Convert from cents
    tax: (invoice.tax || 0) / 100,
    total: invoice.total / 100,
    currency: invoice.currency,
    status: 'paid',
    paidAt: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : new Date(),
    invoiceUrl: invoice.hosted_invoice_url || null,
    invoicePdfUrl: invoice.invoice_pdf || null,
  } as any).onConflictDoUpdate({
    target: invoices.stripeInvoiceId,
    set: {
      status: 'paid',
      paidAt: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      invoiceUrl: invoice.hosted_invoice_url || null,
      invoicePdfUrl: invoice.invoice_pdf || null,
      updatedAt: new Date(),
    },
  });

  console.log('[Stripe Webhook] Invoice payment recorded successfully');
}

/**
 * Handle invoice.payment_failed
 * Called when an invoice payment fails
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.userId;

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in invoice');
    return;
  }

  console.log('[Stripe Webhook] Invoice payment failed for user:', userId);

  // Get user to find org_id if needed
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    console.error('[Stripe Webhook] User not found:', userId);
    return;
  }

  // Update or create invoice record
  await db.insert(invoices).values({
    stripeInvoiceId: invoice.id,
    amount: invoice.amount_due / 100,
    tax: (invoice.tax || 0) / 100,
    total: invoice.total / 100,
    currency: invoice.currency,
    status: 'payment_failed',
  } as any).onConflictDoUpdate({
    target: invoices.stripeInvoiceId,
    set: {
      status: 'payment_failed',
      updatedAt: new Date(),
    },
  });

  // TODO: Send payment failed email notification to user
  console.log('[Stripe Webhook] Payment failure recorded - email notification needed');
}

/**
 * Handle customer.subscription.trial_will_end
 * Called 3 days before trial ends
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in subscription metadata');
    return;
  }

  console.log('[Stripe Webhook] Trial ending soon for user:', userId);

  // TODO: Send trial ending email notification to user
  console.log('[Stripe Webhook] Trial ending notification - email needed');
}
