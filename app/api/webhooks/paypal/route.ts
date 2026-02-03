/**
 * PayPal Webhook Handler
 * POST /api/webhooks/paypal
 *
 * Handles PayPal subscription and payment events
 * Documentation: https://developer.paypal.com/api/rest/webhooks/
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { subscriptions, billingEvents, invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  summary: string;
  resource: any;
  create_time: string;
  event_version: string;
}

/**
 * POST /api/webhooks/paypal
 * Handle PayPal webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (important for production)
    // const signature = request.headers.get('paypal-transmission-sig');
    // const webhookId = request.headers.get('paypal-transmission-id');
    // const timestamp = request.headers.get('paypal-transmission-time');
    // TODO: Verify signature using PayPal SDK

    const event: PayPalWebhookEvent = await request.json();

    logger.payment.info('PayPal webhook received', {
      eventType: event.event_type,
      eventId: event.id,
    });

    // Log event to billing_events table
    await db.insert(billingEvents).values({
      eventType: event.event_type,
      eventData: event,
      paypalEventId: event.id,
      processed: false,
    });

    // Handle different event types
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(event);
        break;

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(event);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(event);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(event);
        break;

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await handleSubscriptionSuspended(event);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(event);
        break;

      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(event);
        break;

      case 'PAYMENT.SALE.REFUNDED':
        await handlePaymentRefunded(event);
        break;

      default:
        logger.payment.warn('Unhandled PayPal event type', {
          eventType: event.event_type,
        });
    }

    // Mark event as processed
    await db
      .update(billingEvents)
      .set({ processed: true })
      .where(eq(billingEvents.paypalEventId, event.id));

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.payment.error('PayPal webhook error', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription created event
 */
async function handleSubscriptionCreated(event: PayPalWebhookEvent) {
  const subscriptionId = event.resource.id;

  logger.payment.info('Subscription created', {
    paypalSubscriptionId: subscriptionId,
  });

  // Subscription already created in our database when user initiated it
  // Just log the event
}

/**
 * Handle subscription activated event
 */
async function handleSubscriptionActivated(event: PayPalWebhookEvent) {
  const subscriptionId = event.resource.id;
  const subscriberEmail = event.resource.subscriber?.email_address;

  logger.payment.info('Subscription activated', {
    paypalSubscriptionId: subscriptionId,
    subscriberEmail,
  });

  // Update subscription status to active
  await db
    .update(subscriptions)
    .set({
      status: 'active',
      paypalSubscriptionId: subscriptionId,
      currentPeriodStart: new Date(event.resource.start_time || new Date()),
      currentPeriodEnd: event.resource.billing_info?.next_billing_time
        ? new Date(event.resource.billing_info.next_billing_time)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));

  logger.payment.info('Subscription status updated to active', {
    paypalSubscriptionId: subscriptionId,
  });
}

/**
 * Handle subscription updated event
 */
async function handleSubscriptionUpdated(event: PayPalWebhookEvent) {
  const subscriptionId = event.resource.id;

  logger.payment.info('Subscription updated', {
    paypalSubscriptionId: subscriptionId,
  });

  // Update subscription details
  await db
    .update(subscriptions)
    .set({
      currentPeriodEnd: event.resource.billing_info?.next_billing_time
        ? new Date(event.resource.billing_info.next_billing_time)
        : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));
}

/**
 * Handle subscription cancelled event
 */
async function handleSubscriptionCancelled(event: PayPalWebhookEvent) {
  const subscriptionId = event.resource.id;

  logger.payment.info('Subscription cancelled', {
    paypalSubscriptionId: subscriptionId,
  });

  // Update subscription status
  await db
    .update(subscriptions)
    .set({
      status: 'cancelled',
      canceledAt: new Date(),
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));
}

/**
 * Handle subscription suspended event
 */
async function handleSubscriptionSuspended(event: PayPalWebhookEvent) {
  const subscriptionId = event.resource.id;

  logger.payment.info('Subscription suspended', {
    paypalSubscriptionId: subscriptionId,
  });

  // Update subscription status
  await db
    .update(subscriptions)
    .set({
      status: 'suspended',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));
}

/**
 * Handle subscription expired event
 */
async function handleSubscriptionExpired(event: PayPalWebhookEvent) {
  const subscriptionId = event.resource.id;

  logger.payment.info('Subscription expired', {
    paypalSubscriptionId: subscriptionId,
  });

  // Update subscription status
  await db
    .update(subscriptions)
    .set({
      status: 'expired',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paypalSubscriptionId, subscriptionId));
}

/**
 * Handle payment completed event
 */
async function handlePaymentCompleted(event: PayPalWebhookEvent) {
  const paymentId = event.resource.id;
  const amount = event.resource.amount?.total;
  const currency = event.resource.amount?.currency;

  logger.payment.info('Payment completed', {
    paymentId,
    amount,
    currency,
  });

  // Create invoice record
  // Note: You'd typically link this to subscription and get more details
  await db.insert(invoices).values({
    status: 'paid',
    paymentProvider: 'paypal',
    paypalInvoiceId: paymentId,
    amountUsd: amount,
    totalUsd: amount,
    currency: currency || 'USD',
    paidAt: new Date(event.create_time),
  });

  logger.payment.info('Invoice created for payment', {
    paymentId,
  });
}

/**
 * Handle payment refunded event
 */
async function handlePaymentRefunded(event: PayPalWebhookEvent) {
  const paymentId = event.resource.sale_id;
  const refundAmount = event.resource.amount?.total;

  logger.payment.info('Payment refunded', {
    paymentId,
    refundAmount,
  });

  // Update invoice to refunded status
  await db
    .update(invoices)
    .set({
      status: 'refunded',
      notes: `Refunded: $${refundAmount}`,
      updatedAt: new Date(),
    })
    .where(eq(invoices.paypalInvoiceId, paymentId));
}
