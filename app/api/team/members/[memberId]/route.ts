import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { organizationMembers, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteContext {
  params: {
    memberId: string;
  };
}

/**
 * DELETE /api/team/members/[memberId]
 * Remove a member from the organization
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const context = await requireOrgAdmin();
    
    if (!context.organizationId) {
      return NextResponse.json({ error: 'Not part of an organization' }, { status: 403 });
    }

    const { memberId } = params;

    // Prevent removing yourself
    if (memberId === context.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // Get member to verify they're in the same org
    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, memberId),
        eq(organizationMembers.organizationId, context.organizationId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent removing the owner (unless you're platform admin)
    if (member.role === 'owner' && !context.isPlatformAdmin) {
      return NextResponse.json({ error: 'Cannot remove organization owner' }, { status: 403 });
    }

    // Deactivate the membership
    await db.update(organizationMembers)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(organizationMembers.id, member.id));

    // Remove organization from user
    await db.update(users)
      .set({ 
        organizationId: null,
        role: 'individual', // Convert to individual account
        updatedAt: new Date(),
      })
      .where(eq(users.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 500 });
  }
}

/**
 * PATCH /api/team/members/[memberId]
 * Update a member's role
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const context = await requireOrgAdmin();
    
    if (!context.organizationId) {
      return NextResponse.json({ error: 'Not part of an organization' }, { status: 403 });
    }

    const { memberId } = params;
    const body = await request.json();
    const { role } = body;

    if (!['owner', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent changing your own role
    if (memberId === context.userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Get member to verify they're in the same org
    const member = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, memberId),
        eq(organizationMembers.organizationId, context.organizationId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Only owner or platform admin can change ownership
    if (role === 'owner' && member.role !== 'owner' && context.orgRole !== 'owner' && !context.isPlatformAdmin) {
      return NextResponse.json({ error: 'Only the current owner can transfer ownership' }, { status: 403 });
    }

    // Update member role
    await db.update(organizationMembers)
      .set({ 
        role,
        updatedAt: new Date(),
      })
      .where(eq(organizationMembers.id, member.id));

    // Update user role if becoming admin/owner
    if (role === 'owner' || role === 'admin') {
      await db.update(users)
        .set({ 
          role: 'org_admin',
          updatedAt: new Date(),
        })
        .where(eq(users.id, memberId));
    } else {
      await db.update(users)
        .set({ 
          role: 'org_user',
          updatedAt: new Date(),
        })
        .where(eq(users.id, memberId));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: error.message || 'Failed to update member' }, { status: 500 });
  }
}

