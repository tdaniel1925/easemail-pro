import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { paymentMethods, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/payment-methods
 * Get all payment methods for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get payment methods from database
    const methods = await db.query.paymentMethods.findMany({
      where: user.organizationId
        ? eq(paymentMethods.organizationId, user.organizationId)
        : eq(paymentMethods.userId, user.id),
      orderBy: (pm, { desc }) => [desc(pm.isDefault), desc(pm.createdAt)],
    });

    return NextResponse.json({ paymentMethods: methods });
  } catch (error) {
    console.error('[Payment Methods API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/payment-methods
 * Add a new payment method via Stripe
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { stripePaymentMethodId, setAsDefault } = body;

    if (!stripePaymentMethodId) {
      return NextResponse.json(
        { error: 'Stripe payment method ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get payment method details from Stripe
    const stripePaymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);

    if (stripePaymentMethod.type !== 'card') {
      return NextResponse.json(
        { error: 'Only card payment methods are supported' },
        { status: 400 }
      );
    }

    // Create or get Stripe customer
    let stripeCustomerId = user.organizationId
      ? (await db.query.organizations.findFirst({
          where: (orgs: any, { eq }: any) => eq(orgs.id, user.organizationId),
          // @ts-expect-error - stripeCustomerId exists in runtime
        }))?.stripeCustomerId
      : null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName || undefined,
        metadata: {
          userId: user.id,
          organizationId: user.organizationId || '',
        },
      });
      stripeCustomerId = customer.id;
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(stripePaymentMethodId, {
      customer: stripeCustomerId,
    });

    // If setting as default, set it as default in Stripe
    if (setAsDefault) {
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: stripePaymentMethodId,
        },
      });

      // Unset current default in database
      await db.update(paymentMethods)
        .set({ isDefault: false })
        .where(
          user.organizationId
            ? eq(paymentMethods.organizationId, user.organizationId)
            : eq(paymentMethods.userId, user.id)
        );
    }

    // Check if this is the only payment method
    const existingMethods = await db.query.paymentMethods.findMany({
      where: user.organizationId
        ? eq(paymentMethods.organizationId, user.organizationId)
        : eq(paymentMethods.userId, user.id),
    });

    const isFirstMethod = existingMethods.length === 0;

    // Save payment method to database
    const [newMethod] = await db.insert(paymentMethods).values({
      userId: user.organizationId ? null : user.id,
      organizationId: user.organizationId || null,
      type: 'card',
      stripePaymentMethodId,
      stripeCustomerId,
      isDefault: setAsDefault || isFirstMethod,
      brand: stripePaymentMethod.card?.brand || null,
      lastFour: stripePaymentMethod.card?.last4 || null,
      expiryMonth: stripePaymentMethod.card?.exp_month || null,
      expiryYear: stripePaymentMethod.card?.exp_year || null,
      billingName: stripePaymentMethod.billing_details?.name || null,
      billingEmail: stripePaymentMethod.billing_details?.email || null,
      billingAddress: stripePaymentMethod.billing_details?.address
        ? {
            street: stripePaymentMethod.billing_details.address.line1 || undefined,
            city: stripePaymentMethod.billing_details.address.city || undefined,
            state: stripePaymentMethod.billing_details.address.state || undefined,
            zip: stripePaymentMethod.billing_details.address.postal_code || undefined,
            country: stripePaymentMethod.billing_details.address.country || undefined,
          }
        : null,
      status: 'active',
    }).returning();

    return NextResponse.json({
      success: true,
      paymentMethod: newMethod,
    });
  } catch (error: any) {
    console.error('[Payment Methods API] Error adding payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add payment method' },
      { status: 500 }
    );
  }
}
