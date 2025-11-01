import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { usagePricing } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// GET /api/admin/pricing/usage - List all usage pricing
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    const usage = await db.select().from(usagePricing).orderBy(usagePricing.serviceType);

    return NextResponse.json(usage);
  } catch (error: any) {
    console.error('Error fetching usage pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch usage pricing' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

// POST /api/admin/pricing/usage - Create new usage pricing
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    await requirePlatformAdmin(supabase);

    const body = await request.json();
    const { serviceType, pricingModel, baseRate, unit, description } = body;

    if (!serviceType || !pricingModel || baseRate === undefined || !unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [newUsage] = await db.insert(usagePricing).values({
      serviceType,
      pricingModel,
      baseRate: baseRate.toString(),
      unit,
      description: description || null,
      isActive: true,
      updatedAt: new Date(),
    }).returning();

    return NextResponse.json(newUsage, { status: 201 });
  } catch (error: any) {
    console.error('Error creating usage pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create usage pricing' },
      { status: 500 }
    );
  }
}

