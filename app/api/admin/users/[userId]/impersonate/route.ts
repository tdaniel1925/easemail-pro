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
    const adminClient = createAdminClient();

    // Generate an access token for the target user
    // We'll use the admin API to create a session token
    const { data: tokenData, error: tokenError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
    });

    if (tokenError || !tokenData) {
      console.error('Failed to generate impersonation token:', tokenError);
      return NextResponse.json({
        error: 'Failed to create impersonation session',
        details: tokenError?.message || 'Unknown error'
      }, { status: 500 });
    }

    // Extract the hashed token from the email link
    // The link format is: {redirectTo}#access_token={token}&...
    // We need to extract just the token part
    const actionLink = tokenData.properties.action_link;
    const hashIndex = actionLink.indexOf('#');
    if (hashIndex === -1) {
      console.error('Invalid action link format:', actionLink);
      return NextResponse.json({
        error: 'Failed to create impersonation session',
        details: 'Invalid token format'
      }, { status: 500 });
    }

    // Parse the hash fragment to get the tokens
    const hashParams = new URLSearchParams(actionLink.substring(hashIndex + 1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      console.error('Missing tokens in action link');
      return NextResponse.json({
        error: 'Failed to create impersonation session',
        details: 'Missing authentication tokens'
      }, { status: 500 });
    }

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
