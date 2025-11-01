/**
 * Role-Based Access Control (RBAC) Utilities
 * Provides functions to check user permissions and roles
 */

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizationMembers, organizations } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export type UserRole = 'platform_admin' | 'org_admin' | 'org_user' | 'individual';
export type OrgRole = 'owner' | 'admin' | 'member';

export interface UserContext {
  userId: string;
  email: string;
  userRole: UserRole;
  organizationId: string | null;
  orgRole: OrgRole | null;
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
}

/**
 * Get the authenticated user's full context including org membership
 */
export async function getUserContext(): Promise<UserContext | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Get user from database with organization info
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: {
        organizationMemberships: {
          where: (members, { eq }) => eq(members.isActive, true),
          with: {
            organization: true,
          },
        },
      },
    });

    if (!dbUser) {
      return null;
    }

    // Get the active organization membership
    const orgMembership = dbUser.organizationMemberships?.[0];

    return {
      userId: dbUser.id,
      email: dbUser.email,
      userRole: dbUser.role as UserRole,
      organizationId: dbUser.organizationId,
      orgRole: orgMembership?.role as OrgRole || null,
      isPlatformAdmin: dbUser.role === 'platform_admin',
      isOrgAdmin: orgMembership?.role === 'owner' || orgMembership?.role === 'admin',
    };
  } catch (error) {
    console.error('Error getting user context:', error);
    return null;
  }
}

/**
 * Check if user is a platform admin (super user)
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const context = await getUserContext();
  return context?.isPlatformAdmin || false;
}

/**
 * Check if user can manage a specific organization
 */
export async function canManageOrganization(organizationId: string): Promise<boolean> {
  const context = await getUserContext();
  
  if (!context) return false;
  
  // Platform admins can manage any organization
  if (context.isPlatformAdmin) return true;
  
  // User must be an admin of the specific organization
  return context.organizationId === organizationId && context.isOrgAdmin;
}

/**
 * Check if user is a member of a specific organization
 */
export async function isMemberOfOrganization(organizationId: string): Promise<boolean> {
  const context = await getUserContext();
  
  if (!context) return false;
  
  // Platform admins have access to all organizations
  if (context.isPlatformAdmin) return true;
  
  // Check if user is a member
  return context.organizationId === organizationId;
}

/**
 * Check if user has an individual account (not part of an organization)
 */
export async function hasIndividualAccount(): Promise<boolean> {
  const context = await getUserContext();
  return context?.userRole === 'individual' && context.organizationId === null;
}

/**
 * Check if user has a team account (part of an organization)
 */
export async function hasTeamAccount(): Promise<boolean> {
  const context = await getUserContext();
  return context?.organizationId !== null;
}

/**
 * Get organization details for the current user
 */
export async function getUserOrganization() {
  const context = await getUserContext();
  
  if (!context?.organizationId) {
    return null;
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, context.organizationId),
    with: {
      members: {
        where: (members, { eq }) => eq(members.isActive, true),
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
      subscriptions: {
        where: (subs, { eq }) => eq(subs.status, 'active'),
      },
    },
  });

  return organization;
}

/**
 * Require authentication or throw an error
 */
export async function requireAuth(): Promise<UserContext> {
  const context = await getUserContext();
  
  if (!context) {
    throw new Error('Unauthorized');
  }
  
  return context;
}

/**
 * Require platform admin role or throw an error
 */
export async function requirePlatformAdmin(): Promise<UserContext> {
  const context = await requireAuth();
  
  if (!context.isPlatformAdmin) {
    throw new Error('Forbidden: Platform admin access required');
  }
  
  return context;
}

/**
 * Require organization admin role or throw an error
 */
export async function requireOrgAdmin(organizationId?: string): Promise<UserContext> {
  const context = await requireAuth();
  
  // Platform admins always have access
  if (context.isPlatformAdmin) {
    return context;
  }
  
  // Check organization membership
  const targetOrgId = organizationId || context.organizationId;
  
  if (!targetOrgId || context.organizationId !== targetOrgId) {
    throw new Error('Forbidden: Not a member of this organization');
  }
  
  if (!context.isOrgAdmin) {
    throw new Error('Forbidden: Organization admin access required');
  }
  
  return context;
}

/**
 * Check if user can perform action on resource
 */
export interface ResourcePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManage: boolean;
}

export async function getResourcePermissions(
  resourceOwnerId: string,
  resourceOrgId?: string | null
): Promise<ResourcePermissions> {
  const context = await getUserContext();
  
  if (!context) {
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canManage: false,
    };
  }
  
  // Platform admins can do everything
  if (context.isPlatformAdmin) {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canManage: true,
    };
  }
  
  // Check if user owns the resource
  const isOwner = context.userId === resourceOwnerId;
  
  // Check if resource belongs to user's organization
  const isOrgResource = resourceOrgId && context.organizationId === resourceOrgId;
  
  return {
    canView: isOwner || isOrgResource || false,
    canEdit: isOwner || (isOrgResource && context.isOrgAdmin) || false,
    canDelete: isOwner || (isOrgResource && context.isOrgAdmin) || false,
    canManage: (isOwner && context.isOrgAdmin) || false,
  };
}

