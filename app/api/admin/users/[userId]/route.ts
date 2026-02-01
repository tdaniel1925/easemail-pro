import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, notFound, internalError, badRequest } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

// GET: Fetch user details
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized access to user details');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to view user details', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    const { userId } = params;

    // Fetch user details
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      logger.admin.warn('User not found', { targetUserId: userId, requestedBy: dbUser.email });
      return notFound('User not found');
    }

    logger.admin.info('User details fetched', {
      targetUserId: userId,
      targetEmail: targetUser.email,
      requestedBy: dbUser.email
    });

    return successResponse({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role,
        subscriptionTier: targetUser.subscriptionTier,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
        organizationId: targetUser.organizationId,
      },
    });
  } catch (error) {
    logger.api.error('User fetch error', error);
    return internalError();
  }
}

// PATCH: Update user details (CSRF Protected)
export const PATCH = withCsrfProtection(async (
  request: NextRequest,
  { params }: { params: { userId: string } }
) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized user update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to update user', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    const { userId } = params;
    const body = await request.json();

    const { role, subscriptionTier, fullName } = body;

    // Validate at least one field is being updated
    if (role === undefined && subscriptionTier === undefined && fullName === undefined) {
      logger.admin.warn('No fields provided for user update', { targetUserId: userId, requestedBy: dbUser.email });
      return badRequest('At least one field must be provided');
    }

    // Update user
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (subscriptionTier !== undefined) updateData.subscriptionTier = subscriptionTier;
    if (fullName !== undefined) updateData.fullName = fullName;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      logger.admin.warn('User not found for update', { targetUserId: userId, requestedBy: dbUser.email });
      return notFound('User not found');
    }

    logger.admin.info('User updated successfully', {
      targetUserId: userId,
      targetEmail: updated.email,
      updatedFields: Object.keys(updateData),
      updatedBy: dbUser.email
    });

    return successResponse({ user: updated }, 'User updated successfully');
  } catch (error) {
    logger.api.error('User update error', error);
    return internalError();
  }
});

// DELETE: Delete user (CSRF Protected)
export const DELETE = withCsrfProtection(async (
  request: NextRequest,
  { params }: { params: { userId: string } }
) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized user deletion attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to delete user', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    const { userId } = params;

    // Prevent deleting yourself
    if (userId === user.id) {
      logger.admin.warn('Admin attempted to delete own account', { adminEmail: dbUser.email });
      return badRequest('Cannot delete your own account');
    }

    // Get target user info before deletion (for logging)
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      logger.admin.warn('User not found for deletion', { targetUserId: userId, requestedBy: dbUser.email });
      return notFound('User not found');
    }

    // Delete user (cascade will handle related records)
    await db.delete(users).where(eq(users.id, userId));

    logger.security.info('User deleted', {
      deletedUserId: userId,
      deletedUserEmail: targetUser.email,
      deletedBy: dbUser.email,
      deletedByUserId: dbUser.id
    });

    return successResponse({ deleted: true }, 'User deleted successfully');
  } catch (error) {
    logger.api.error('User deletion error', error);
    return internalError();
  }
});
