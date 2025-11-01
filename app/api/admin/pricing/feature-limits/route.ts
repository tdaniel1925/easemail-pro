import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { planFeatureLimits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// GET /api/admin/pricing/feature-limits - Get feature limits (optionally by planId)
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');

    let limits;
    if (planId) {
      limits = await db
        .select()
        .from(planFeatureLimits)
        .where(eq(planFeatureLimits.planId, planId));
    } else {
      limits = await db.select().from(planFeatureLimits);
    }

    return NextResponse.json(limits);
  } catch (error: any) {
    console.error('Error fetching feature limits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch feature limits' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

// POST /api/admin/pricing/feature-limits - Create feature limit
export async function POST(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const body = await request.json();
    const { planId, featureKey, limitValue, description } = body;

    if (!planId || !featureKey || limitValue === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [newLimit] = await db.insert(planFeatureLimits).values({
      planId,
      featureKey,
      limitValue,
      description: description || null,
    }).returning();

    return NextResponse.json(newLimit, { status: 201 });
  } catch (error: any) {
    console.error('Error creating feature limit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create feature limit' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/pricing/feature-limits/[limitId] - Update feature limit
export async function PATCH(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const limitId = searchParams.get('limitId');

    if (!limitId) {
      return NextResponse.json({ error: 'Limit ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { limitValue, description } = body;

    const updateData: any = {};
    if (limitValue !== undefined) updateData.limitValue = limitValue;
    if (description !== undefined) updateData.description = description;

    const [updatedLimit] = await db
      .update(planFeatureLimits)
      .set(updateData)
      .where(eq(planFeatureLimits.id, limitId))
      .returning();

    if (!updatedLimit) {
      return NextResponse.json({ error: 'Feature limit not found' }, { status: 404 });
    }

    return NextResponse.json(updatedLimit);
  } catch (error: any) {
    console.error('Error updating feature limit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update feature limit' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/pricing/feature-limits - Delete feature limit
export async function DELETE(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const limitId = searchParams.get('limitId');

    if (!limitId) {
      return NextResponse.json({ error: 'Limit ID is required' }, { status: 400 });
    }

    await db.delete(planFeatureLimits).where(eq(planFeatureLimits.id, limitId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting feature limit:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete feature limit' },
      { status: 500 }
    );
  }
}

