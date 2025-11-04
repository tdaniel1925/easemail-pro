import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Verify invitation token and get user info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find user by invitation token
    const user = await db.query.users.findFirst({
      where: eq(users.invitationToken, token),
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    // Check if token is expired (24 hours)
    if (user.invitationExpiresAt && new Date(user.invitationExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if already accepted
    if (user.invitationAcceptedAt) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    });
  } catch (error: any) {
    console.error('Invitation verification error:', error);
    return NextResponse.json({ error: 'Failed to verify invitation' }, { status: 500 });
  }
}

// Accept invitation and set password
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find user by invitation token
    const user = await db.query.users.findFirst({
      where: eq(users.invitationToken, token),
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
    }

    // Check if token is expired
    if (user.invitationExpiresAt && new Date(user.invitationExpiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if already accepted
    if (user.invitationAcceptedAt) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    // Update password in Supabase Auth
    const supabase = await createClient();
    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      password: password,
      email_confirm: true,
      ban_duration: 'none',
    });

    if (authError) {
      console.error('Failed to update password:', authError);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    // Update user in database
    await db.update(users)
      .set({
        invitationAcceptedAt: new Date(),
        invitationToken: null, // Clear the token
        accountStatus: 'active',
        requirePasswordChange: false, // They just set it!
        tempPassword: null,
        tempPasswordExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'Account activated successfully',
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Invitation acceptance error:', error);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}

