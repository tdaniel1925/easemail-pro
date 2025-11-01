import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { pricingTiers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// PATCH /api/admin/pricing/tiers/[tierId] - Update pricing tier
export async function PATCH(
  request: NextRequest,
  { params }: { params: { tierId: string } }
) {
  try {
    await requirePlatformAdmin();

    const body = await request.json();
    const { tierName, minQuantity, maxQuantity, ratePerUnit } = body;

    const updateData: any = {};

    if (tierName !== undefined) updateData.tierName = tierName;
    if (minQuantity !== undefined) updateData.minQuantity = minQuantity;
    if (maxQuantity !== undefined) updateData.maxQuantity = maxQuantity;
    if (ratePerUnit !== undefined) updateData.ratePerUnit = ratePerUnit.toString();

    const [updatedTier] = await db
      .update(pricingTiers)
      .set(updateData)
      .where(eq(pricingTiers.id, params.tierId))
      .returning();

    if (!updatedTier) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTier);
  } catch (error: any) {
    console.error('Error updating pricing tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pricing tier' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pricing/tiers/[tierId] - Delete pricing tier
export async function DELETE(
  request: NextRequest,
  { params }: { params: { tierId: string } }
) {
  try {
    await requirePlatformAdmin();

    await db.delete(pricingTiers).where(eq(pricingTiers.id, params.tierId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting pricing tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete pricing tier' },
      { status: 500 }
    );
  }
}

