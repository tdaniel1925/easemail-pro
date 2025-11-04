import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateSecurePassword, hashPassword, generatePasswordExpiry } from '@/lib/auth/password-utils';
import { sendEmail } from '@/lib/email/send';
import { getPasswordResetCredentialsTemplate, getPasswordResetCredentialsSubject } from '@/lib/email/templates/password-reset-credentials';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

// POST: Generate and send new temporary password (admin only)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requesting user is platform admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!adminUser || adminUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate NEW temporary password
    const newTempPassword = generateSecurePassword(16);
    const tempPasswordExpiry = generatePasswordExpiry();

    console.log(`🔐 Generated new temporary password for ${targetUser.email} by admin ${adminUser.email}`);
    console.log(`🔑 Password: ${newTempPassword}`); // Log it for debugging

    // Update password in Supabase Auth FIRST
    const adminClient = createAdminClient();
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newTempPassword,
      email_confirm: true, // Ensure email is confirmed
      ban_duration: 'none', // Ensure user is not banned
    });

    if (authError) {
      console.error('❌ Failed to update password in Supabase Auth:', authError);
      return NextResponse.json({ 
        error: 'Failed to update password',
        details: authError.message 
      }, { status: 500 });
    }

    console.log(`✅ Updated password in Supabase Auth for ${targetUser.email}`);

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

    console.log(`📝 Updated user record in database`);

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
      console.error('⚠️ Failed to send password reset email:', result.error);
      return NextResponse.json({ 
        error: 'Password was updated but failed to send email',
        details: result.error 
      }, { status: 500 });
    }

    console.log(`✅ Password reset email sent to ${targetUser.email}`);

    return NextResponse.json({ 
      success: true, 
      message: `New temporary password generated and sent to ${targetUser.email}` 
    });
  } catch (error: any) {
    console.error('❌ Password reset error:', error);
    return NextResponse.json({ 
      error: 'Failed to reset password',
      details: error.message 
    }, { status: 500 });
  }
}

