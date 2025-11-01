import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { organizationPricingOverrides, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// GET /api/admin/pricing/overrides - List all organization overrides
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    // Fetch overrides with organization names
    const overrides = await db
      .select({
        id: organizationPricingOverrides.id,
        organizationId: organizationPricingOverrides.organizationId,
        organizationName: organizations.name,
        planId: organizationPricingOverrides.planId,
        customMonthlyRate: organizationPricingOverrides.customMonthlyRate,
        customAnnualRate: organizationPricingOverrides.customAnnualRate,
        customSmsRate: organizationPricingOverrides.customSmsRate,
        customAiRate: organizationPricingOverrides.customAiRate,
        customStorageRate: organizationPricingOverrides.customStorageRate,
        notes: organizationPricingOverrides.notes,
      })
      .from(organizationPricingOverrides)
      .leftJoin(organizations, eq(organizationPricingOverrides.organizationId, organizations.id));

    return NextResponse.json(overrides);
  } catch (error: any) {
    console.error('Error fetching organization overrides:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch organization overrides' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

// POST /api/admin/pricing/overrides - Create new organization override
export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const body = await request.json();
    const { 
      organizationId, 
      planId, 
      customMonthlyRate, 
      customAnnualRate, 
      customSmsRate, 
      customAiRate, 
      customStorageRate, 
      notes 
    } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    const [newOverride] = await db.insert(organizationPricingOverrides).values({
      organizationId,
      planId: planId || null,
      customMonthlyRate: customMonthlyRate ? customMonthlyRate.toString() : null,
      customAnnualRate: customAnnualRate ? customAnnualRate.toString() : null,
      customSmsRate: customSmsRate ? customSmsRate.toString() : null,
      customAiRate: customAiRate ? customAiRate.toString() : null,
      customStorageRate: customStorageRate ? customStorageRate.toString() : null,
      notes: notes || null,
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newOverride, { status: 201 });
  } catch (error: any) {
    console.error('Error creating organization override:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create organization override' },
      { status: 500 }
    );
  }
}

