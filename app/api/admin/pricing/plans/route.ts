import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/supabase/server';
import { db } from '@/lib/db/drizzle';
import { pricingPlans } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// GET /api/admin/pricing/plans - List all pricing plans
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    const plans = await db.select().from(pricingPlans).orderBy(pricingPlans.name);

    return NextResponse.json(plans);
  } catch (error: any) {
    console.error('Error fetching pricing plans:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pricing plans' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

// POST /api/admin/pricing/plans - Create a new pricing plan
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    const body = await request.json();
    const { name, displayName, description, basePriceMonthly, basePriceAnnual, minSeats, maxSeats } = body;

    if (!name || !displayName || basePriceMonthly === undefined || basePriceAnnual === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [newPlan] = await db.insert(pricingPlans).values({
      name,
      displayName,
      description: description || null,
      basePriceMonthly: basePriceMonthly.toString(),
      basePriceAnnual: basePriceAnnual.toString(),
      minSeats: minSeats || 1,
      maxSeats: maxSeats || null,
      isActive: true,
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newPlan, { status: 201 });
  } catch (error: any) {
    console.error('Error creating pricing plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create pricing plan' },
      { status: 500 }
    );
  }
}

