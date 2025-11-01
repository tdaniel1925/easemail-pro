import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';
import { getPasswordResetTemplate, getPasswordResetSubject } from '@/lib/email/templates/password-reset';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

// POST: Send password reset email (admin only)
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const supabase = createClient();
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

    // Generate password reset link using Supabase Auth
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.email,
    });

    if (error) {
      console.error('Password reset link generation error:', error);
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 });
    }

    // Send password reset email
    const emailData = {
      recipientName: targetUser.fullName || targetUser.email,
      resetLink: data.properties?.action_link || '',
      expiryHours: 24,
    };

    const result = await sendEmail({
      to: targetUser.email,
      subject: getPasswordResetSubject(emailData),
      html: getPasswordResetTemplate(emailData),
    });

    if (!result.success) {
      console.error('Password reset email send error:', result.error);
      return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
    }

    console.log(`✅ Password reset email sent to ${targetUser.email} by admin ${adminUser.email}`);

    return NextResponse.json({ 
      success: true, 
      message: `Password reset email sent to ${targetUser.email}` 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });
  }
}

