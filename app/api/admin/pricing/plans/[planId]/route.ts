import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase/server';
import { db } from '@/lib/db/drizzle';
import { pricingPlans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// PATCH /api/admin/pricing/plans/[planId] - Update a pricing plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    const body = await request.json();
    const { displayName, description, basePriceMonthly, basePriceAnnual, minSeats, maxSeats, isActive } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (basePriceMonthly !== undefined) updateData.basePriceMonthly = basePriceMonthly.toString();
    if (basePriceAnnual !== undefined) updateData.basePriceAnnual = basePriceAnnual.toString();
    if (minSeats !== undefined) updateData.minSeats = minSeats;
    if (maxSeats !== undefined) updateData.maxSeats = maxSeats;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedPlan] = await db
      .update(pricingPlans)
      .set(updateData)
      .where(eq(pricingPlans.id, params.planId))
      .returning();

    if (!updatedPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json(updatedPlan);
  } catch (error: any) {
    console.error('Error updating pricing plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pricing plan' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pricing/plans/[planId] - Delete a pricing plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    await db.delete(pricingPlans).where(eq(pricingPlans.id, params.planId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting pricing plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete pricing plan' },
      { status: 500 }
    );
  }
}

