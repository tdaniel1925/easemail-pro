import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizationMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ userId: string }>;
};

/**
 * PATCH /api/organization/users/[userId] (CSRF Protected)
 *
 * Update a user in the organization
 */
export const PATCH = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return unauthorized();
    }

    // Get current user
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser || !currentUser.organizationId) {
      return forbidden('You must be part of an organization');
    }

    // Check permissions
    const allowedRoles = ['org_admin', 'platform_admin', 'user_admin'];
    if (!allowedRoles.includes(currentUser.role)) {
      return forbidden('Organization admin access required');
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return notFound('User not found');
    }

    // Check that target user is in same organization
    if (targetUser.organizationId !== currentUser.organizationId) {
      return forbidden('Cannot modify users from other organizations');
    }

    // Cannot modify self
    if (targetUser.id === currentUser.id) {
      return badRequest('Cannot modify your own account');
    }

    const body = await request.json();
    const { orgRole, suspended } = body;

    // user_admin cannot modify admins or owners
    if (currentUser.role === 'user_admin') {
      const targetMember = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, currentUser.organizationId)
        ),
      });

      if (targetMember && (targetMember.role === 'owner' || targetMember.role === 'admin')) {
        return forbidden('User admins cannot modify owners or admins');
      }
    }

    // Update org role if provided
    if (orgRole) {
      const validOrgRoles = ['owner', 'admin', 'user_admin', 'member'];
      if (!validOrgRoles.includes(orgRole)) {
        return badRequest('Invalid organization role');
      }

      // user_admin cannot set owner or admin roles
      if (currentUser.role === 'user_admin' && (orgRole === 'owner' || orgRole === 'admin')) {
        return forbidden('User admins cannot create owners or admins');
      }

      await db
        .update(organizationMembers)
        .set({ role: orgRole })
        .where(
          and(
            eq(organizationMembers.userId, userId),
            eq(organizationMembers.organizationId, currentUser.organizationId)
          )
        );

      // Update system role based on org role
      const systemRole = orgRole === 'owner' || orgRole === 'admin' ? 'org_admin'
                       : orgRole === 'user_admin' ? 'user_admin'
                       : 'org_user';

      await db
        .update(users)
        .set({ role: systemRole })
        .where(eq(users.id, userId));
    }

    // Update suspended status if provided
    if (typeof suspended === 'boolean') {
      await db
        .update(users)
        .set({ suspended })
        .where(eq(users.id, userId));
    }

    // Fetch updated user
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const updatedMember = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, currentUser.organizationId)
      ),
    });

    logger.admin.info('Organization user updated', {
      userId,
      updatedBy: currentUser.email,
      organizationId: currentUser.organizationId,
    });

    return successResponse({
      user: {
        id: updatedUser!.id,
        email: updatedUser!.email,
        fullName: updatedUser!.fullName,
        role: updatedUser!.role,
        orgRole: updatedMember?.role || 'member',
        suspended: updatedUser!.suspended,
      },
    }, 'User updated successfully');
  } catch (error) {
    logger.api.error('Error updating organization user', error);
    return internalError();
  }
});

/**
 * DELETE /api/organization/users/[userId] (CSRF Protected)
 *
 * Remove a user from the organization
 */
export const DELETE = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { userId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return unauthorized();
    }

    // Get current user
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!currentUser || !currentUser.organizationId) {
      return forbidden('You must be part of an organization');
    }

    // Check permissions (user_admin cannot delete)
    const allowedRoles = ['org_admin', 'platform_admin'];
    if (!allowedRoles.includes(currentUser.role)) {
      return forbidden('Organization admin access required');
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return notFound('User not found');
    }

    // Check same organization
    if (targetUser.organizationId !== currentUser.organizationId) {
      return forbidden('Cannot delete users from other organizations');
    }

    // Cannot delete self
    if (targetUser.id === currentUser.id) {
      return badRequest('Cannot delete your own account');
    }

    // Delete organization membership
    await db
      .delete(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, currentUser.organizationId)
        )
      );

    // Soft delete: clear organization ID and suspend
    await db
      .update(users)
      .set({
        organizationId: null,
        suspended: true,
        role: 'individual',
      })
      .where(eq(users.id, userId));

    logger.admin.info('Organization user removed', {
      userId,
      removedBy: currentUser.email,
      organizationId: currentUser.organizationId,
    });

    return successResponse(null, 'User removed from organization successfully');
  } catch (error) {
    logger.api.error('Error deleting organization user', error);
    return internalError();
  }
});
