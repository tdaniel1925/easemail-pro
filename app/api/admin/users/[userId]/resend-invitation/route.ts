import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';
import { 
  getInvitationEmailTemplate, 
  getInvitationEmailSubject,
  generateInvitationToken,
  generateInvitationExpiry
} from '@/lib/email/templates/invitation-email';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export const dynamic = 'force-dynamic';

// POST: Resend invitation to user
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser || currentUser.role !== 'platform_admin') {
      return NextResponse.json({ 
        error: 'Forbidden - Platform admin access required' 
      }, { status: 403 });
    }

    // Get the target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has already accepted invitation
    if (targetUser.invitationAcceptedAt) {
      return NextResponse.json({ 
        error: 'User has already accepted their invitation and is active' 
      }, { status: 400 });
    }

    // Generate new invitation token
    const newInvitationToken = generateInvitationToken();
    const newInvitationExpiry = generateInvitationExpiry(7); // 7 days

    // Update user with new invitation token
    await db.update(users)
      .set({
        invitationToken: newInvitationToken,
        invitationExpiresAt: newInvitationExpiry,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Send new invitation email
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${newInvitationToken}`;
    
    const emailData = {
      recipientName: targetUser.fullName || targetUser.email,
      recipientEmail: targetUser.email,
      invitationUrl: invitationUrl,
      inviterName: currentUser.fullName || currentUser.email,
      expiryDays: 7,
    };

    const emailResult = await sendEmail({
      to: targetUser.email,
      subject: getInvitationEmailSubject(emailData),
      html: getInvitationEmailTemplate(emailData),
    });

    if (!emailResult.success) {
      console.error('⚠️ Failed to send invitation email:', emailResult.error);
      return NextResponse.json({ 
        error: 'Failed to send invitation email',
        details: emailResult.error 
      }, { status: 500 });
    }

    console.log(`✅ Invitation resent to ${targetUser.email}`);

    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${targetUser.email}`,
    });
  } catch (error: any) {
    console.error('❌ Resend invitation error:', error);
    return NextResponse.json({ 
      error: 'Failed to resend invitation',
      details: error.message 
    }, { status: 500 });
  }
}

