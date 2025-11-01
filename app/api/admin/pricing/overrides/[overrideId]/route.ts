import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { organizationPricingOverrides } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// PATCH /api/admin/pricing/overrides/[overrideId] - Update organization override
export async function PATCH(
  request: NextRequest,
  { params }: { params: { overrideId: string } }
) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    const body = await request.json();
    const { 
      planId, 
      customMonthlyRate, 
      customAnnualRate, 
      customSmsRate, 
      customAiRate, 
      customStorageRate, 
      notes 
    } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (planId !== undefined) updateData.planId = planId;
    if (customMonthlyRate !== undefined) updateData.customMonthlyRate = customMonthlyRate ? customMonthlyRate.toString() : null;
    if (customAnnualRate !== undefined) updateData.customAnnualRate = customAnnualRate ? customAnnualRate.toString() : null;
    if (customSmsRate !== undefined) updateData.customSmsRate = customSmsRate ? customSmsRate.toString() : null;
    if (customAiRate !== undefined) updateData.customAiRate = customAiRate ? customAiRate.toString() : null;
    if (customStorageRate !== undefined) updateData.customStorageRate = customStorageRate ? customStorageRate.toString() : null;
    if (notes !== undefined) updateData.notes = notes;

    const [updatedOverride] = await db
      .update(organizationPricingOverrides)
      .set(updateData)
      .where(eq(organizationPricingOverrides.id, params.overrideId))
      .returning();

    if (!updatedOverride) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 });
    }

    return NextResponse.json(updatedOverride);
  } catch (error: any) {
    console.error('Error updating organization override:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update organization override' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pricing/overrides/[overrideId] - Delete organization override
export async function DELETE(
  request: NextRequest,
  { params }: { params: { overrideId: string } }
) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    await db.delete(organizationPricingOverrides).where(eq(organizationPricingOverrides.id, params.overrideId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting organization override:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete organization override' },
      { status: 500 }
    );
  }
}

