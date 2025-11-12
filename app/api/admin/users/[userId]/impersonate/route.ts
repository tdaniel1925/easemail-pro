import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userAuditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * POST /api/admin/users/[userId]/impersonate
 *
 * Allow platform admins to impersonate (log in as) another user for troubleshooting.
 * This creates a temporary session for the target user and logs the impersonation.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { userId: targetUserId } = await context.params;
    const supabase = await createClient();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requesting user is platform admin
    const dbAdmin = await db.query.users.findFirst({
      where: eq(users.id, adminUser.id),
    });

    if (!dbAdmin || dbAdmin.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Prevent self-impersonation (no real benefit, could cause confusion)
    if (targetUserId === adminUser.id) {
      return NextResponse.json({ error: 'Cannot impersonate yourself' }, { status: 400 });
    }

    // Get target user details
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check if target user is suspended
    if (targetUser.suspended) {
      return NextResponse.json({
        error: 'Cannot impersonate suspended user',
        details: 'The target user account is currently suspended'
      }, { status: 400 });
    }

    console.log(`🎭 Admin ${dbAdmin.email} (${adminUser.id}) impersonating user ${targetUser.email} (${targetUserId})`);

    // Create impersonation session using Supabase Admin Client
    const adminClient = await createAdminClient();

    // Generate a magic link and extract the OTP token
    console.log('[Impersonate] Generating OTP for user:', targetUserId);

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
    });

    if (linkError || !linkData) {
      console.error('[Impersonate] Failed to generate link:', linkError);
      return NextResponse.json({
        error: 'Failed to create impersonation session',
        details: linkError?.message || 'Link generation failed'
      }, { status: 500 });
    }

    // Use the email_otp to verify and create a session
    const emailOtp = linkData.properties.email_otp;

    if (!emailOtp) {
      console.error('[Impersonate] No OTP in response');
      return NextResponse.json({
        error: 'Failed to create impersonation session',
        details: 'No OTP generated'
      }, { status: 500 });
    }

    // Verify the OTP using the regular client to get a session
    const regularClient = await createClient();
    const { data: verifyData, error: verifyError } = await regularClient.auth.verifyOtp({
      email: targetUser.email,
      token: emailOtp,
      type: 'email',
    });

    if (verifyError || !verifyData?.session) {
      console.error('[Impersonate] Failed to verify OTP:', verifyError);
      return NextResponse.json({
        error: 'Failed to create impersonation session',
        details: verifyError?.message || 'OTP verification failed'
      }, { status: 500 });
    }

    const accessToken = verifyData.session.access_token;
    const refreshToken = verifyData.session.refresh_token;

    console.log('[Impersonate] Session created successfully:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });

    // Log the impersonation action in audit logs
    await db.insert(userAuditLogs).values({
      userId: adminUser.id, // Admin who performed the impersonation
      action: 'impersonated_user',
      performedBy: adminUser.id,
      details: {
        targetUserId: targetUserId,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        reason: 'troubleshooting',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    // Also log from target user's perspective
    await db.insert(userAuditLogs).values({
      userId: targetUserId, // User being impersonated
      action: 'was_impersonated',
      performedBy: adminUser.id,
      details: {
        adminUserId: adminUser.id,
        adminUserEmail: dbAdmin.email,
        reason: 'troubleshooting',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    console.log(`✅ Impersonation tokens generated successfully`);

    // Create response with impersonation metadata
    const response = NextResponse.json({
      success: true,
      session: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
      user: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role,
      },
      impersonation: {
        adminUserId: adminUser.id,
        adminEmail: dbAdmin.email,
        targetUserId: targetUserId,
        targetEmail: targetUser.email,
        startedAt: new Date().toISOString(),
      },
    });

    return response;
  } catch (error) {
    console.error('❌ User impersonation error:', error);
    return NextResponse.json({
      error: 'Failed to impersonate user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
