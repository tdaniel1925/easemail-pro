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
 * PATCH /api/billing/payment-methods/[id]
 * Update a payment method (e.g., set as default)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { setAsDefault } = body;
    const paymentMethodId = params.id;

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get payment method from database
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, paymentMethodId),
        user.organizationId
          ? eq(paymentMethods.organizationId, user.organizationId)
          : eq(paymentMethods.userId, user.id)
      ),
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // If setting as default
    if (setAsDefault) {
      // Unset current default in database
      await db.update(paymentMethods)
        .set({ isDefault: false })
        .where(
          user.organizationId
            ? eq(paymentMethods.organizationId, user.organizationId)
            : eq(paymentMethods.userId, user.id)
        );

      // Set new default in database
      await db.update(paymentMethods)
        .set({ isDefault: true })
        .where(eq(paymentMethods.id, paymentMethodId));

      // Update Stripe customer default payment method
      if (paymentMethod.stripeCustomerId && paymentMethod.stripePaymentMethodId) {
        await stripe.customers.update(paymentMethod.stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethod.stripePaymentMethodId,
          },
        });
      }
    }

    // Get updated payment method
    const updatedMethod = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, paymentMethodId),
    });

    return NextResponse.json({
      success: true,
      paymentMethod: updatedMethod,
    });
  } catch (error: any) {
    console.error('[Payment Methods API] Error updating payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update payment method' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/billing/payment-methods/[id]
 * Remove a payment method
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paymentMethodId = params.id;

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get payment method from database
    const paymentMethod = await db.query.paymentMethods.findFirst({
      where: and(
        eq(paymentMethods.id, paymentMethodId),
        user.organizationId
          ? eq(paymentMethods.organizationId, user.organizationId)
          : eq(paymentMethods.userId, user.id)
      ),
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Check if this is the default payment method
    if (paymentMethod.isDefault) {
      // Count remaining payment methods
      const remainingMethods = await db.query.paymentMethods.findMany({
        where: and(
          user.organizationId
            ? eq(paymentMethods.organizationId, user.organizationId)
            : eq(paymentMethods.userId, user.id),
          (pm: any, { ne }: any) => ne(pm.id, paymentMethodId)
        ),
      });

      if (remainingMethods.length > 0) {
        // Set another payment method as default
        await db.update(paymentMethods)
          .set({ isDefault: true })
          .where(eq(paymentMethods.id, remainingMethods[0].id));

        // Update Stripe customer default
        if (remainingMethods[0].stripeCustomerId && remainingMethods[0].stripePaymentMethodId) {
          await stripe.customers.update(remainingMethods[0].stripeCustomerId, {
            invoice_settings: {
              default_payment_method: remainingMethods[0].stripePaymentMethodId,
            },
          });
        }
      }
    }

    // Detach payment method from Stripe
    if (paymentMethod.stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
      } catch (error) {
        console.error('[Payment Methods API] Error detaching from Stripe:', error);
        // Continue with database deletion even if Stripe detach fails
      }
    }

    // Delete from database
    await db.delete(paymentMethods).where(eq(paymentMethods.id, paymentMethodId));

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error: any) {
    console.error('[Payment Methods API] Error removing payment method:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove payment method' },
      { status: 500 }
    );
  }
}
