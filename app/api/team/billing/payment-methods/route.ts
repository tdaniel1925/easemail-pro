/**
 * Payment Methods API
 * GET /api/team/billing/payment-methods - List payment methods
 * POST /api/team/billing/payment-methods - Add new payment method
 * DELETE /api/team/billing/payment-methods/[id] - Remove payment method
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, requireAuth } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { paymentMethods } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const context = await requireAuth();
    
    // Get payment methods for org or user
    const methods = await db.query.paymentMethods.findMany({
      where: context.organizationId
        ? eq(paymentMethods.organizationId, context.organizationId)
        : eq(paymentMethods.userId, context.userId),
      orderBy: (pm, { desc }) => [desc(pm.isDefault), desc(pm.createdAt)],
    });
    
    return NextResponse.json({
      success: true,
      paymentMethods: methods,
    });
  } catch (error: any) {
    console.error('Failed to fetch payment methods:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // CRITICAL FIX #3: Billing operations require admin privileges
    const context = await requireOrgAdmin();
    const body = await request.json();
    
    const {
      type,
      stripePaymentMethodId,
      lastFour,
      brand,
      expiryMonth,
      expiryYear,
      billingName,
      billingEmail,
      billingAddress,
      isDefault,
    } = body;
    
    if (!type || !stripePaymentMethodId) {
      return NextResponse.json(
        { success: false, error: 'type and stripePaymentMethodId are required' },
        { status: 400 }
      );
    }
    
    // If setting as default, unset other defaults first
    if (isDefault) {
      if (context.organizationId) {
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.organizationId, context.organizationId));
      } else {
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.userId, context.userId));
      }
    }
    
    // Create payment method
    const [method] = await db.insert(paymentMethods).values({
      organizationId: context.organizationId,
      userId: context.organizationId ? null : context.userId,
      type,
      stripePaymentMethodId,
      lastFour,
      brand,
      expiryMonth,
      expiryYear,
      billingName,
      billingEmail,
      billingAddress: billingAddress as any,
      isDefault: isDefault || false,
      status: 'active',
    }).returning();
    
    return NextResponse.json({
      success: true,
      paymentMethod: method,
    });
  } catch (error: any) {
    console.error('Failed to add payment method:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // CRITICAL FIX #3: Billing operations require admin privileges
    const context = await requireOrgAdmin();
    const { searchParams } = new URL(request.url);
    const methodId = searchParams.get('id');
    
    if (!methodId) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID is required' },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const method = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, methodId),
    });
    
    if (!method) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }
    
    if (
      (method.organizationId && method.organizationId !== context.organizationId) ||
      (method.userId && method.userId !== context.userId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Delete payment method
    await db.delete(paymentMethods).where(eq(paymentMethods.id, methodId));
    
    return NextResponse.json({
      success: true,
      message: 'Payment method deleted',
    });
  } catch (error: any) {
    console.error('Failed to delete payment method:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // CRITICAL FIX #3: Billing operations require admin privileges
    const context = await requireOrgAdmin();
    const body = await request.json();
    const { id, isDefault } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID is required' },
        { status: 400 }
      );
    }
    
    // Verify ownership
    const method = await db.query.paymentMethods.findFirst({
      where: eq(paymentMethods.id, id),
    });
    
    if (!method) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }
    
    if (
      (method.organizationId && method.organizationId !== context.organizationId) ||
      (method.userId && method.userId !== context.userId)
    ) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // If setting as default, unset others
    if (isDefault) {
      if (context.organizationId) {
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.organizationId, context.organizationId));
      } else {
        await db.update(paymentMethods)
          .set({ isDefault: false })
          .where(eq(paymentMethods.userId, context.userId));
      }
    }
    
    // Update payment method
    const [updated] = await db.update(paymentMethods)
      .set({ isDefault, updatedAt: new Date() })
      .where(eq(paymentMethods.id, id))
      .returning();
    
    return NextResponse.json({
      success: true,
      paymentMethod: updated,
    });
  } catch (error: any) {
    console.error('Failed to update payment method:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

