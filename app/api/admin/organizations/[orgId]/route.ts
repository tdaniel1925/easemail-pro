import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizations, organizationMembers } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

// PATCH: Update organization
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, planType, billingEmail, maxSeats, isActive } = body;

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (planType !== undefined) updateData.planType = planType;
    if (billingEmail !== undefined) updateData.billingEmail = billingEmail;
    if (maxSeats !== undefined) updateData.maxSeats = maxSeats;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update organization
    await db.update(organizations)
      .set(updateData)
      .where(eq(organizations.id, orgId));

    console.log(`✅ Organization ${orgId} updated by admin ${dbUser.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Organization update error:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

// DELETE: Delete organization
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { orgId } = await context.params;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Check if organization has members (use direct select to avoid relation issues)
    const memberCountResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));
    
    const memberCount = Number(memberCountResult[0]?.count || 0);

    if (memberCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete organization with ${memberCount} member(s). Remove all members first.` 
      }, { status: 400 });
    }

    // Delete organization (cascading deletes will handle related records)
    await db.delete(organizations).where(eq(organizations.id, orgId));

    console.log(`✅ Organization ${orgId} deleted by admin ${dbUser.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Organization delete error:', error);
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
  }
}

