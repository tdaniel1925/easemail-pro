import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db/drizzle';
import { users, subscriptions, invoices, paypalBillingPlans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getPayPalClient } from '@/lib/paypal/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/paypal/webhook
 * Handle PayPal webhook events for subscription lifecycle
 *
 * Webhook Events:
 * - BILLING.SUBSCRIPTION.ACTIVATED
 * - BILLING.SUBSCRIPTION.UPDATED
 * - BILLING.SUBSCRIPTION.CANCELLED
 * - BILLING.SUBSCRIPTION.SUSPENDED
 * - BILLING.SUBSCRIPTION.EXPIRED
 * - PAYMENT.SALE.COMPLETED
 * - PAYMENT.SALE.REFUNDED
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhookEvent = JSON.parse(body);

    const headersList = await headers();

    // Verify webhook signature
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (webhookId) {
      const paypal = getPayPalClient();

      const isValid = await paypal.verifyWebhookSignature(
        webhookEvent,
        {
          'paypal-transmission-id': headersList.get('paypal-transmission-id') || '',
          'paypal-transmission-time': headersList.get('paypal-transmission-time') || '',
          'paypal-transmission-sig': headersList.get('paypal-transmission-sig') || '',
          'paypal-cert-url': headersList.get('paypal-cert-url') || '',
          'paypal-auth-algo': headersList.get('paypal-auth-algo') || '',
        },
        webhookId
      );

      if (!isValid) {
        console.error('[PayPal Webhook] Signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else {
      console.warn('[PayPal Webhook] PAYPAL_WEBHOOK_ID not set - skipping signature verification');
    }

    console.log('[PayPal Webhook] Event received:', webhookEvent.event_type);

    // Handle different event types
    const eventType = webhookEvent.event_type;
    const resource = webhookEvent.resource;

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(resource);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(resource);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(resource);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(resource);
        break;

      case 'PAYMENT.SALE.REFUNDED':
        await handlePaymentRefunded(resource);
        break;

      default:
        console.log(`[PayPal Webhook] Unhandled event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[PayPal Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle BILLING.SUBSCRIPTION.ACTIVATED
 * Called when a subscription is activated after user approval
 */
async function handleSubscriptionActivated(resource: any) {
  const userId = resource.custom_id;
  const subscriptionId = resource.id;
  const planId = resource.plan_id;

  if (!userId) {
    console.error('[PayPal Webhook] Missing custom_id (user ID) in subscription');
    return;
  }

  console.log('[PayPal Webhook] Subscription activated for user:', userId);

  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    console.error('[PayPal Webhook] User not found:', userId);
    return;
  }

  // Extract plan details from subscription
  const quantity = parseInt(resource.quantity || '1');

  // Determine plan type from plan_id (should match paypalBillingPlans table)
  const paypalPlan = await db.query.paypalBillingPlans.findFirst({
    where: eq(paypalBillingPlans.paypalPlanId, planId),
  });

  const planType = paypalPlan?.planId || 'individual';
  const billingCycle = paypalPlan?.billingCycle || 'monthly';

  // Determine if it's an organization subscription
  const isOrgSubscription = planType === 'team' || planType === 'enterprise';

  // Parse billing info
  const nextBillingTime = resource.billing_info?.next_billing_time
    ? new Date(resource.billing_info.next_billing_time)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const startTime = resource.start_time ? new Date(resource.start_time) : new Date();

  // Create or update subscription in database
  await db.insert(subscriptions).values({
    userId: isOrgSubscription ? null : userId,
    organizationId: isOrgSubscription ? user.organizationId : null,
    planId: planType,
    planName: planType.charAt(0).toUpperCase() + planType.slice(1),
    paymentProvider: 'paypal',
    paypalSubscriptionId: subscriptionId,
    paypalPlanId: planId,
    status: resource.status.toLowerCase(),
    currentPeriodStart: startTime,
    currentPeriodEnd: nextBillingTime,
    cancelAtPeriodEnd: false,
    seats: quantity,
    billingCycle: billingCycle as 'monthly' | 'annual',
  }).onConflictDoUpdate({
    target: subscriptions.paypalSubscriptionId,
    set: {
      status: resource.status.toLowerCase(),
      currentPeriodStart: startTime,
      currentPeriodEnd: nextBillingTime,
      seats: quantity,
      updatedAt: new Date(),
    },
  });

  // Update user role if needed
  if (planType === 'individual' && user.role === 'user') {
    await db.update(users)
      .set({ role: 'individual' })
      .where(eq(users.id, userId));
  } else if (planType === 'team' && user.organizationId && user.role === 'user') {
    await db.update(users)
      .set({ role: 'org_user' })
      .where(eq(users.id, userId));
  }

  console.log('[PayPal Webhook] Subscription created successfully');
}

/**
 * Handle BILLING.SUBSCRIPTION.UPDATED
 * Called when a subscription is updated (plan change, etc.)
 */
async function handleSubscriptionUpdated(resource: any) {
  const subscriptionId = resource.id;

  console.log('[PayPal Webhook] Updating subscription:', subscriptionId);

  const quantity = parseInt(resource.quantity || '1');
  const nextBillingTime = resource.billing_info?.next_billing_time
    ? new Date(resource.billing_info.next_billing_time)
    : null;

  // Update subscription in database
  await db.update(subscriptions)
    .set({
      status: resource.status.toLowerCase(),
      currentPeriodEnd: nextBillingTime,
      seats: quantity,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));

  console.log('[PayPal Webhook] Subscription updated successfully');
}

/**
 * Handle BILLING.SUBSCRIPTION.CANCELLED
 * Called when a subscription is cancelled
 */
async function handleSubscriptionCancelled(resource: any) {
  const subscriptionId = resource.id;
  const userId = resource.custom_id;

  console.log('[PayPal Webhook] Subscription cancelled:', subscriptionId);

  // Mark subscription as canceled
  await db.update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));

  // Downgrade user to free plan
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user && (user.role === 'individual' || user.role === 'org_user')) {
      await db.update(users)
        .set({ role: 'user' })
        .where(eq(users.id, userId));
    }
  }

  console.log('[PayPal Webhook] Subscription cancelled successfully');
}

/**
 * Handle BILLING.SUBSCRIPTION.SUSPENDED
 * Called when a subscription is suspended (payment failure, etc.)
 */
async function handleSubscriptionSuspended(resource: any) {
  const subscriptionId = resource.id;

  console.log('[PayPal Webhook] Subscription suspended:', subscriptionId);

  await db.update(subscriptions)
    .set({
      status: 'suspended',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));

  console.log('[PayPal Webhook] Subscription suspended successfully');
}

/**
 * Handle BILLING.SUBSCRIPTION.EXPIRED
 * Called when a subscription expires
 */
async function handleSubscriptionExpired(resource: any) {
  const subscriptionId = resource.id;
  const userId = resource.custom_id;

  console.log('[PayPal Webhook] Subscription expired:', subscriptionId);

  await db.update(subscriptions)
    .set({
      status: 'expired',
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));

  // Downgrade user to free plan
  if (userId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (user && (user.role === 'individual' || user.role === 'org_user')) {
      await db.update(users)
        .set({ role: 'user' })
        .where(eq(users.id, userId));
    }
  }

  console.log('[PayPal Webhook] Subscription expired successfully');
}

/**
 * Handle PAYMENT.SALE.COMPLETED
 * Called when a payment is completed
 */
async function handlePaymentCompleted(resource: any) {
  const saleId = resource.id;
  const subscriptionId = resource.billing_agreement_id;
  const amount = parseFloat(resource.amount.total);
  const currency = resource.amount.currency;

  console.log('[PayPal Webhook] Payment completed:', saleId);

  // Get subscription to find user
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.paypalSubscriptionId, subscriptionId),
  });

  if (!subscription) {
    console.error('[PayPal Webhook] Subscription not found for payment:', subscriptionId);
    return;
  }

  // Create invoice record
  await db.insert(invoices).values({
    organizationId: subscription.organizationId,
    userId: subscription.userId,
    paymentProvider: 'paypal',
    paypalInvoiceId: saleId,
    amount: amount.toString(),
    total: amount.toString(),
    currency,
    status: 'paid',
    paidAt: new Date(resource.create_time),
  } as any);

  console.log('[PayPal Webhook] Payment recorded successfully');
}

/**
 * Handle PAYMENT.SALE.REFUNDED
 * Called when a payment is refunded
 */
async function handlePaymentRefunded(resource: any) {
  const saleId = resource.sale_id;
  const refundId = resource.id;

  console.log('[PayPal Webhook] Payment refunded:', saleId);

  // Update invoice status
  await db.update(invoices)
    .set({
      status: 'refunded',
      updatedAt: new Date(),
    })
    .where(eq(invoices.paypalInvoiceId, saleId));

  console.log('[PayPal Webhook] Refund recorded successfully');
}
