import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateSecurePassword, hashPassword, generatePasswordExpiry } from '@/lib/auth/password-utils';
import { sendEmail } from '@/lib/email/send';
import { getPasswordResetCredentialsTemplate, getPasswordResetCredentialsSubject } from '@/lib/email/templates/password-reset-credentials';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * POST /api/admin/users/[userId]/reset-password
 * Generate and send new temporary password (CSRF Protected)
 */
export const POST = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized password reset attempt');
      return unauthorized();
    }

    // Check if requesting user is platform admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!adminUser || adminUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted password reset', {
        userId: user.id,
        email: user.email,
        role: adminUser?.role
      });
      return forbidden('Platform admin access required');
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      logger.admin.warn('Password reset attempted for non-existent user', {
        targetUserId: userId,
        requestedBy: adminUser.email
      });
      return notFound('User not found');
    }

    // Generate NEW temporary password
    const newTempPassword = generateSecurePassword(16);
    const tempPasswordExpiry = generatePasswordExpiry();

    logger.admin.info('Generated new temporary password', {
      targetUser: targetUser.email,
      requestedBy: adminUser.email
    });

    // Update password in Supabase Auth FIRST
    const adminClient = await createAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newTempPassword,
      email_confirm: true, // Ensure email is confirmed
      ban_duration: 'none', // Ensure user is not banned
    });

    if (authError) {
      logger.api.error('Failed to update password in Supabase Auth', {
        error: authError,
        targetUser: targetUser.email,
        requestedBy: adminUser.email
      });
      return internalError('Failed to update password');
    }

    logger.admin.info('Updated password in Supabase Auth', {
      targetUser: targetUser.email,
      requestedBy: adminUser.email
    });

    // Update user record in database (store plain password temporarily for reference)
    await db.update(users)
      .set({
        tempPassword: newTempPassword, // Store plain text temporarily (will be cleared after first login)
        requirePasswordChange: true,
        tempPasswordExpiresAt: tempPasswordExpiry,
        accountStatus: 'active', // Set to active so they can log in
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.admin.info('Updated user record in database', {
      targetUser: targetUser.email,
      requestedBy: adminUser.email
    });

    // Send password reset credentials email
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    
    const emailData = {
      recipientName: targetUser.fullName || targetUser.email,
      recipientEmail: targetUser.email,
      organizationName: targetUser.organizationId ? 'Your Organization' : 'EaseMail',
      tempPassword: newTempPassword, // Send plain text password in email (only time it's exposed)
      loginUrl: loginUrl,
      expiryDays: 7,
      adminName: adminUser.fullName || adminUser.email,
    };

    const result = await sendEmail({
      to: targetUser.email,
      subject: getPasswordResetCredentialsSubject(emailData),
      html: getPasswordResetCredentialsTemplate(emailData),
    });

    if (!result.success) {
      logger.api.error('Failed to send password reset email', {
        error: result.error,
        targetUser: targetUser.email,
        requestedBy: adminUser.email
      });
      return internalError('Password was updated but failed to send email');
    }

    logger.admin.info('Password reset completed successfully', {
      targetUser: targetUser.email,
      requestedBy: adminUser.email,
      emailSent: true
    });

    return successResponse(
      { message: `New temporary password generated and sent to ${targetUser.email}` },
      'Password reset successful'
    );
  } catch (error: any) {
    logger.api.error('Error resetting password', error);
    return internalError();
  }
});

