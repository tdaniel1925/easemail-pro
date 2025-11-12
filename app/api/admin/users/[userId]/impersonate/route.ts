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

    // Generate a magic link for the target user
    // This creates a single-use link that automatically logs the user in
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
    });

    if (linkError || !linkData) {
      console.error('Failed to generate impersonation link:', linkError);
      return NextResponse.json({
        error: 'Failed to create impersonation session',
        details: linkError?.message || 'Unknown error'
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

    console.log(`✅ Impersonation link created successfully`);

    // Return the magic link URL
    // The client will redirect to this URL which will automatically log them in
    return NextResponse.json({
      success: true,
      magicLink: linkData.properties.action_link,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role,
      },
    });
  } catch (error) {
    console.error('❌ User impersonation error:', error);
    return NextResponse.json({
      error: 'Failed to impersonate user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
