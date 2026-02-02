import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, getUserContext } from '@/lib/auth/permissions';
import { db } from '@/lib/db/drizzle';
import { organizationMembers, users, teamInvitations, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/lib/email/send';
import { 
  getTeamInviteTemplate, 
  getTeamInviteSubject 
} from '@/lib/email/templates/team-invite';

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
        member: {
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

    if (!['owner', 'admin', 'user_admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be "owner", "admin", "user_admin", or "member"' }, { status: 400 });
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

    // Get inviter and organization details for email
    const [inviter, org] = await Promise.all([
      db.query.users.findFirst({ 
        where: eq(users.id, context.userId),
        columns: { fullName: true, email: true }
      }),
      db.query.organizations.findFirst({ 
        where: eq(organizations.id, context.organizationId),
        columns: { name: true }
      }),
    ]);

    // Calculate expiry date
    const expiryDate = new Date(invitation.expiresAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/team/accept-invite?token=${token}`;

    // Send invitation email
    const emailData = {
      organizationName: org?.name || 'Team',
      inviterName: inviter?.fullName || inviter?.email || 'Someone',
      inviterEmail: inviter?.email || '',
      recipientEmail: email,
      role: role as 'admin' | 'member',
      inviteLink,
      expiryDate,
    };

    // Send email (async, don't block the response)
    sendEmail({
      to: email,
      subject: getTeamInviteSubject(emailData),
      html: getTeamInviteTemplate(emailData),
    }).then(result => {
      if (result.success) {
        console.log(`✅ Invitation email sent to ${email}`);
      } else {
        console.error(`❌ Failed to send invitation email to ${email}:`, result.error);
      }
    }).catch(err => {
      console.error(`❌ Error sending invitation email:`, err);
    });

    console.log(`📧 Invitation created for ${email}`);
    console.log(`Invitation link: ${inviteLink}`);

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        inviteLink,
      },
    });
  } catch (error: any) {
    console.error('Error inviting team member:', error);
    return NextResponse.json({ error: error.message || 'Failed to send invitation' }, { status: 500 });
  }
}

