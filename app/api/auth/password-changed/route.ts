import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userAuditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/password-changed
 * Called after user successfully changes their password
 * Updates database flags and logs audit event
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Verify the authenticated user matches the userId
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update user record
    await db.update(users)
      .set({
        requirePasswordChange: false,
        tempPassword: null,
        tempPasswordExpiresAt: null,
        accountStatus: 'active', // Change from pending to active
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Log audit event
    await db.insert(userAuditLogs).values({
      userId: userId,
      action: 'password_changed',
      performedBy: userId, // User changed their own password
      details: {
        changedVia: 'forced_change',
        reason: 'temporary_password_replacement',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // ✅ SECURITY: Don't log user ID in production
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ User ${userId} successfully changed their password`);
    } else {
      console.log('✅ User successfully changed their password');
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error updating password changed status:', error);
    return NextResponse.json({ 
      error: 'Failed to update status',
      details: error.message 
    }, { status: 500 });
  }
}

