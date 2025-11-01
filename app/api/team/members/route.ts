import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, getUserContext } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { organizationMembers, users, teamInvitations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

/**
 * GET /api/team/members
 * List all members of the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getUserContext();
    
    if (!context || !context.organizationId) {
      return NextResponse.json({ error: 'Not part of an organization' }, { status: 403 });
    }

    // Get all active members
    const members = await db.query.organizationMembers.findMany({
      where: and(
        eq(organizationMembers.organizationId, context.organizationId),
        eq(organizationMembers.isActive, true)
      ),
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: (members, { desc }) => [desc(members.joinedAt)],
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch members' }, { status: 500 });
  }
}

/**
 * POST /api/team/members
 * Invite a new member to the organization
 */
export async function POST(request: NextRequest) {
  try {
    // Require org admin permissions
    const context = await requireOrgAdmin();
    
    if (!context.organizationId) {
      return NextResponse.json({ error: 'Not part of an organization' }, { status: 403 });
    }

    const body = await request.json();
    const { email, role = 'member' } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user is already a member
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser && existingUser.organizationId === context.organizationId) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.teamInvitations.findFirst({
      where: and(
        eq(teamInvitations.organizationId, context.organizationId),
        eq(teamInvitations.email, email),
        eq(teamInvitations.status, 'pending')
      ),
    });

    if (existingInvitation) {
      return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });
    }

    // Create invitation
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const [invitation] = await db.insert(teamInvitations).values({
      organizationId: context.organizationId,
      email,
      role,
      invitedBy: context.userId,
      token,
      expiresAt,
      status: 'pending',
    }).returning();

    // TODO: Send invitation email
    console.log(`📧 Invitation created for ${email}. Token: ${token}`);
    console.log(`Invitation link: ${process.env.NEXT_PUBLIC_APP_URL}/team/accept-invite?token=${token}`);

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/team/accept-invite?token=${token}`,
      },
    });
  } catch (error: any) {
    console.error('Error inviting team member:', error);
    return NextResponse.json({ error: error.message || 'Failed to send invitation' }, { status: 500 });
  }
}

