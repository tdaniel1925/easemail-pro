/**
 * HIGH PRIORITY FIX: Role-Based Access Control (RBAC)
 *
 * Centralized middleware for authorization and permission checking.
 * Replaces scattered role checks throughout admin routes.
 *
 * Features:
 * - Role-based permissions (platform_admin, org_admin, user)
 * - Permission-based access control
 * - Middleware wrappers for API routes
 * - Organization membership checks
 * - User impersonation support
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, organizationMembers } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * System roles
 */
export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  ORG_ADMIN: 'org_admin',
  ORG_MEMBER: 'org_member',
  USER: 'user',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Permissions that can be granted to roles
 */
export const PERMISSIONS = {
  // Platform admin permissions
  MANAGE_ALL_USERS: 'manage:all_users',
  MANAGE_ALL_ORGS: 'manage:all_organizations',
  VIEW_PLATFORM_STATS: 'view:platform_stats',
  MANAGE_BILLING: 'manage:billing',
  MANAGE_PRICING: 'manage:pricing',
  RUN_MIGRATIONS: 'run:migrations',
  IMPERSONATE_USERS: 'impersonate:users',
  MANAGE_TEMPLATES: 'manage:templates',

  // Organization admin permissions
  MANAGE_ORG: 'manage:organization',
  MANAGE_ORG_MEMBERS: 'manage:organization_members',
  VIEW_ORG_USAGE: 'view:organization_usage',
  MANAGE_ORG_SETTINGS: 'manage:organization_settings',

  // User permissions
  MANAGE_PROFILE: 'manage:profile',
  VIEW_OWN_DATA: 'view:own_data',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role to permissions mapping
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.PLATFORM_ADMIN]: [
    // Platform admins have ALL permissions
    PERMISSIONS.MANAGE_ALL_USERS,
    PERMISSIONS.MANAGE_ALL_ORGS,
    PERMISSIONS.VIEW_PLATFORM_STATS,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.MANAGE_PRICING,
    PERMISSIONS.RUN_MIGRATIONS,
    PERMISSIONS.IMPERSONATE_USERS,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.MANAGE_ORG,
    PERMISSIONS.MANAGE_ORG_MEMBERS,
    PERMISSIONS.VIEW_ORG_USAGE,
    PERMISSIONS.MANAGE_ORG_SETTINGS,
    PERMISSIONS.MANAGE_PROFILE,
    PERMISSIONS.VIEW_OWN_DATA,
  ],
  [ROLES.ORG_ADMIN]: [
    // Org admins can manage their organization
    PERMISSIONS.MANAGE_ORG,
    PERMISSIONS.MANAGE_ORG_MEMBERS,
    PERMISSIONS.VIEW_ORG_USAGE,
    PERMISSIONS.MANAGE_ORG_SETTINGS,
    PERMISSIONS.MANAGE_PROFILE,
    PERMISSIONS.VIEW_OWN_DATA,
  ],
  [ROLES.ORG_MEMBER]: [
    // Org members can view organization data
    PERMISSIONS.VIEW_ORG_USAGE,
    PERMISSIONS.MANAGE_PROFILE,
    PERMISSIONS.VIEW_OWN_DATA,
  ],
  [ROLES.USER]: [
    // Regular users can only manage their own data
    PERMISSIONS.MANAGE_PROFILE,
    PERMISSIONS.VIEW_OWN_DATA,
  ],
};

/**
 * User context after authentication and authorization
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  organizationId: string | null;
  isOrgAdmin: boolean;
  permissions: Permission[];
}

/**
 * Get authenticated user from Supabase and database
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get user from Supabase auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    // Get user from database with role
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    if (!dbUser) {
      console.warn(`User ${user.id} authenticated but not found in database`);
      return null;
    }

    // Check if user is org admin (for organization routes)
    let isOrgAdmin = false;
    if (dbUser.organizationId) {
      const membership = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.userId, user.id),
          eq(organizationMembers.organizationId, dbUser.organizationId)
        ),
      });
      isOrgAdmin = membership?.role === 'admin';
    }

    // Get role (fallback to 'user' if not set)
    const role = (dbUser.role || ROLES.USER) as Role;

    // Get permissions for this role
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.USER];

    return {
      id: dbUser.id,
      email: dbUser.email || user.email || '',
      role,
      organizationId: dbUser.organizationId,
      isOrgAdmin,
      permissions,
    };
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthenticatedUser, permission: Permission): boolean {
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthenticatedUser, permissions: Permission[]): boolean {
  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: AuthenticatedUser, permissions: Permission[]): boolean {
  return permissions.every(permission => user.permissions.includes(permission));
}

/**
 * RBAC middleware wrapper for API routes
 *
 * Usage:
 * ```typescript
 * export const GET = withRole('platform_admin', async (request, { user }) => {
 *   // user is guaranteed to be platform admin
 *   return NextResponse.json({ data: 'admin only data' });
 * });
 * ```
 */
export function withRole(
  requiredRole: Role | Role[],
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser; params?: any }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext?: { params?: any }): Promise<NextResponse> => {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Check role
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    if (!roles.includes(user.role)) {
      console.warn(
        `Access denied: User ${user.id} (${user.role}) attempted to access route requiring ${roles.join(' or ')}`
      );

      return NextResponse.json(
        {
          success: false,
          error: `Forbidden. ${roles.includes(ROLES.PLATFORM_ADMIN) ? 'Platform admin access required.' : 'Insufficient permissions.'}`,
          code: 'FORBIDDEN',
          requiredRole: roles,
          userRole: user.role,
        },
        { status: 403 }
      );
    }

    // Call handler with user context
    return handler(request, {
      user,
      params: routeContext?.params,
    });
  };
}

/**
 * Permission-based middleware wrapper
 *
 * Usage:
 * ```typescript
 * export const GET = withPermission('manage:all_users', async (request, { user }) => {
 *   // user has the required permission
 *   return NextResponse.json({ data: 'protected data' });
 * });
 * ```
 */
export function withPermission(
  requiredPermission: Permission | Permission[],
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser; params?: any }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext?: { params?: any }): Promise<NextResponse> => {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    // Check permission
    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const hasRequiredPermission = hasAnyPermission(user, permissions);

    if (!hasRequiredPermission) {
      console.warn(
        `Permission denied: User ${user.id} (${user.role}) attempted to access route requiring ${permissions.join(' or ')}`
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden. You do not have permission to access this resource.',
          code: 'FORBIDDEN',
          requiredPermissions: permissions,
          userPermissions: user.permissions,
        },
        { status: 403 }
      );
    }

    // Call handler with user context
    return handler(request, {
      user,
      params: routeContext?.params,
    });
  };
}

/**
 * Shorthand for platform admin only routes
 *
 * Usage:
 * ```typescript
 * export const GET = requirePlatformAdmin(async (request, { user }) => {
 *   // Only platform admins can access
 *   return NextResponse.json({ data: 'admin data' });
 * });
 * ```
 */
export function requirePlatformAdmin(
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser; params?: any }
  ) => Promise<NextResponse>
) {
  return withRole(ROLES.PLATFORM_ADMIN, handler);
}

/**
 * Shorthand for organization admin routes
 *
 * Usage:
 * ```typescript
 * export const GET = requireOrgAdmin(async (request, { user }) => {
 *   // Only org admins can access
 *   return NextResponse.json({ data: 'org admin data' });
 * });
 * ```
 */
export function requireOrgAdmin(
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser; params?: any }
  ) => Promise<NextResponse>
) {
  return withRole([ROLES.PLATFORM_ADMIN, ROLES.ORG_ADMIN], handler);
}

/**
 * Any authenticated user can access
 *
 * Usage:
 * ```typescript
 * export const GET = requireAuth(async (request, { user }) => {
 *   // Any logged-in user can access
 *   return NextResponse.json({ data: 'user data' });
 * });
 * ```
 */
export function requireAuth(
  handler: (
    request: NextRequest,
    context: { user: AuthenticatedUser; params?: any }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext?: { params?: any }): Promise<NextResponse> => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Please log in.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    return handler(request, {
      user,
      params: routeContext?.params,
    });
  };
}

/**
 * Check if user can access organization data
 *
 * Usage in route:
 * ```typescript
 * export const GET = requireAuth(async (request, { user, params }) => {
 *   const orgId = params.orgId;
 *
 *   if (!canAccessOrganization(user, orgId)) {
 *     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *   }
 *
 *   // User can access this org
 * });
 * ```
 */
export function canAccessOrganization(user: AuthenticatedUser, organizationId: string): boolean {
  // Platform admins can access any organization
  if (user.role === ROLES.PLATFORM_ADMIN) {
    return true;
  }

  // Users can only access their own organization
  return user.organizationId === organizationId;
}
