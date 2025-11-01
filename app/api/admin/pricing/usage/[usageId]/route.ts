import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { usagePricing } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// PATCH /api/admin/pricing/usage/[usageId] - Update usage pricing
export async function PATCH(
  request: NextRequest,
  { params }: { params: { usageId: string } }
) {
  try {
    await requirePlatformAdmin();

    const body = await request.json();
    const { pricingModel, baseRate, unit, description, isActive } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (pricingModel !== undefined) updateData.pricingModel = pricingModel;
    if (baseRate !== undefined) updateData.baseRate = baseRate.toString();
    if (unit !== undefined) updateData.unit = unit;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedUsage] = await db
      .update(usagePricing)
      .set(updateData)
      .where(eq(usagePricing.id, params.usageId))
      .returning();

    if (!updatedUsage) {
      return NextResponse.json({ error: 'Usage pricing not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUsage);
  } catch (error: any) {
    console.error('Error updating usage pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update usage pricing' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pricing/usage/[usageId] - Delete usage pricing
export async function DELETE(
  request: NextRequest,
  { params }: { params: { usageId: string } }
) {
  try {
    await requirePlatformAdmin();

    await db.delete(usagePricing).where(eq(usagePricing.id, params.usageId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting usage pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete usage pricing' },
      { status: 500 }
    );
  }
}

