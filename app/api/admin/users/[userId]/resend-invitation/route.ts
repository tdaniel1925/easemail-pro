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
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/users/[userId]/resend-invitation
 * Resend invitation to user (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized resend invitation attempt');
      return unauthorized();
    }

    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser || currentUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to resend invitation', {
        userId: user.id,
        email: user.email,
        role: currentUser?.role
      });
      return forbidden('Platform admin access required');
    }

    // Get the target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      logger.admin.warn('Resend invitation attempted for non-existent user', {
        targetUserId: userId,
        requestedBy: currentUser.email
      });
      return notFound('User not found');
    }

    // Check if user has already accepted invitation
    if (targetUser.invitationAcceptedAt) {
      logger.admin.warn('Resend invitation attempted for already-active user', {
        targetUser: targetUser.email,
        requestedBy: currentUser.email
      });
      return badRequest('User has already accepted their invitation and is active');
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
      logger.api.error('Failed to send invitation email', {
        error: emailResult.error,
        targetUser: targetUser.email,
        requestedBy: currentUser.email
      });
      return internalError('Failed to send invitation email');
    }

    logger.admin.info('Invitation resent successfully', {
      targetUser: targetUser.email,
      requestedBy: currentUser.email,
      emailSent: true
    });

    return successResponse(
      { message: `Invitation resent to ${targetUser.email}` },
      'Invitation resent successfully'
    );
  } catch (error: any) {
    logger.api.error('Error resending invitation', error);
    return internalError();
  }
});

