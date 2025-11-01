import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase/server';
import { db } from '@/lib/db/drizzle';
import { pricingTiers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// GET /api/admin/pricing/tiers - List all pricing tiers
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    const tiers = await db.select().from(pricingTiers).orderBy(pricingTiers.minQuantity);

    return NextResponse.json(tiers);
  } catch (error: any) {
    console.error('Error fetching pricing tiers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pricing tiers' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

// POST /api/admin/pricing/tiers - Create new pricing tier
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    const body = await request.json();
    const { usagePricingId, tierName, minQuantity, maxQuantity, ratePerUnit } = body;

    if (!usagePricingId || minQuantity === undefined || ratePerUnit === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [newTier] = await db.insert(pricingTiers).values({
      usagePricingId,
      tierName: tierName || null,
      minQuantity,
      maxQuantity: maxQuantity || null,
      ratePerUnit: ratePerUnit.toString(),
    }).returning();

    return NextResponse.json(newTier, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pricing tier:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pricing tier' },
      { status: 500 }
    );
  }
}

