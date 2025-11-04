import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { 
  users, 
  emailAccounts, 
  emails, 
  contacts, 
  emailSignatures,
  userAuditLogs,
  organizationMembers,
  teamInvitations,
  smsUsage,
  aiUsage,
  storageUsage,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

// PATCH: Update user role or suspension status (admin only)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { role, suspended, fullName, email } = body;

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Validate and add role if provided
    if (role !== undefined) {
      const validRoles = ['platform_admin', 'org_admin', 'org_user', 'individual'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
    }

    // Add suspended status if provided
    if (suspended !== undefined) {
      updateData.suspended = suspended;
    }

    // Add full name if provided
    if (fullName !== undefined) {
      updateData.fullName = fullName;
    }

    // Add email if provided (requires validation)
    if (email !== undefined && email !== '') {
      // Check if email is already taken by another user
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: 'Email already in use by another user' }, { status: 400 });
      }

      updateData.email = email;
    }

    // Update user
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

// DELETE: Delete user account (admin only)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await context.params;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Get user details before deletion for logging
    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`🗑️ Starting deletion process for user: ${userToDelete.email} (${userId})`);

    // Step 1: Delete all related data (in order to avoid foreign key constraints)
    
    // Delete usage tracking records
    await db.delete(smsUsage).where(eq(smsUsage.userId, userId));
    console.log('  ✓ Deleted SMS usage records');
    
    await db.delete(aiUsage).where(eq(aiUsage.userId, userId));
    console.log('  ✓ Deleted AI usage records');
    
    await db.delete(storageUsage).where(eq(storageUsage.userId, userId));
    console.log('  ✓ Deleted storage usage records');

    // Delete email-related data
    const userEmailAccounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, userId),
    });

    for (const account of userEmailAccounts) {
      // Delete all emails for each account
      await db.delete(emails).where(eq(emails.accountId, account.id));
      console.log(`  ✓ Deleted emails for account ${account.email}`);
    }

    // Delete email accounts
    await db.delete(emailAccounts).where(eq(emailAccounts.userId, userId));
    console.log('  ✓ Deleted email accounts');

    // Delete contacts
    await db.delete(contacts).where(eq(contacts.userId, userId));
    console.log('  ✓ Deleted contacts');

    // Delete signatures
    await db.delete(emailSignatures).where(eq(emailSignatures.userId, userId));
    console.log('  ✓ Deleted email signatures');

    // Delete organization memberships
    await db.delete(organizationMembers).where(eq(organizationMembers.userId, userId));
    console.log('  ✓ Deleted organization memberships');

    // Delete team invitations (sent by this user)
    await db.delete(teamInvitations).where(eq(teamInvitations.invitedBy, userId));
    console.log('  ✓ Deleted team invitations');

    // Delete audit logs (or keep them for compliance - your choice)
    // Uncomment if you want to delete audit logs:
    // await db.delete(userAuditLogs).where(eq(userAuditLogs.userId, userId));
    // console.log('  ✓ Deleted audit logs');

    // Step 2: Delete from Supabase Auth
    try {
      const adminClient = createAdminClient();
      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
      
      if (authDeleteError) {
        console.warn(`  ⚠️ Failed to delete from Supabase Auth: ${authDeleteError.message}`);
        // Continue anyway - the database record will be deleted
      } else {
        console.log('  ✓ Deleted from Supabase Auth');
      }
    } catch (authError) {
      console.warn('  ⚠️ Error deleting from Supabase Auth:', authError);
      // Continue anyway
    }

    // Step 3: Delete user from database
    await db.delete(users).where(eq(users.id, userId));
    console.log('  ✓ Deleted user record from database');

    // Log the deletion in audit logs (from admin's perspective)
    await db.insert(userAuditLogs).values({
      userId: user.id, // Admin who performed the deletion
      action: 'deleted_user',
      performedBy: user.id,
      details: {
        deletedUserId: userId,
        deletedUserEmail: userToDelete.email,
        deletedUserRole: userToDelete.role,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    console.log(`✅ User ${userToDelete.email} deleted successfully`);

    return NextResponse.json({ 
      success: true,
      message: `User ${userToDelete.email} and all associated data deleted successfully`
    });
  } catch (error) {
    console.error('❌ User delete error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

