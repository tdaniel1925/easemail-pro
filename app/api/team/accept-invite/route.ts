import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { teamInvitations, users, organizationMembers, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/team/accept-invite
 * Accept a team invitation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find invitation
    const invitation = await db.query.teamInvitations.findFirst({
      where: eq(teamInvitations.token, token),
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
    }

    // Check invitation status
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation is no longer valid' }, { status: 400 });
    }

    // Check expiry
    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await db.update(teamInvitations)
        .set({ status: 'expired' })
        .where(eq(teamInvitations.id, invitation.id));
      
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Verify email matches
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.email !== invitation.email) {
      return NextResponse.json({ error: 'Invitation email does not match your account' }, { status: 403 });
    }

    // Check if user is already in an organization
    if (dbUser.organizationId) {
      return NextResponse.json({ error: 'You are already part of an organization' }, { status: 400 });
    }

    // Add user to organization
    await db.update(users)
      .set({
        organizationId: invitation.organizationId,
        role: invitation.role === 'admin' ? 'org_admin' : 'org_user',
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create organization member record
    await db.insert(organizationMembers).values({
      organizationId: invitation.organizationId,
      userId: user.id,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
      isActive: true,
    });

    // Mark invitation as accepted
    await db.update(teamInvitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
      })
      .where(eq(teamInvitations.id, invitation.id));

    // Update organization seat count
    // First get current org to get seat count
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, invitation.organizationId),
    });

    if (org) {
      await db.update(organizations)
        .set({
          currentSeats: (org.currentSeats || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, invitation.organizationId));
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: invitation.organizationId,
        name: org?.name || 'Team',
      },
    });
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: error.message || 'Failed to accept invitation' }, { status: 500 });
  }
}

