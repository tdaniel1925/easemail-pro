/**
 * API Authentication Middleware
 *
 * Provides reusable authentication and authorization helpers for API routes.
 * Eliminates the duplicated auth checks across 230+ API routes.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type UserRole = 'platform_admin' | 'org_admin' | 'org_user' | 'individual';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  isPlatformAdmin: boolean;
}

export interface AuthResult {
  success: true;
  user: AuthenticatedUser;
}

export interface AuthError {
  success: false;
  response: NextResponse;
}

export type AuthCheck = AuthResult | AuthError;

/**
 * Check if the current request is authenticated and return user context.
 * Use this instead of duplicating auth checks in every API route.
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const auth = await getAuthenticatedUser();
 *   if (!auth.success) return auth.response;
 *
 *   const { user } = auth;
 *   // user is now typed as AuthenticatedUser
 * }
 */
export async function getAuthenticatedUser(): Promise<AuthCheck> {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        ),
      };
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, supabaseUser.id),
    });

    if (!dbUser) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 404 }
        ),
      };
    }

    return {
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        organizationId: dbUser.organizationId,
        isPlatformAdmin: dbUser.role === 'platform_admin',
      },
    };
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Authentication error', code: 'AUTH_ERROR' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require platform admin role.
 * Returns an error response if user is not a platform admin.
 *
 * @example
 * export async function POST(request: NextRequest) {
 *   const auth = await requirePlatformAdmin();
 *   if (!auth.success) return auth.response;
 *
 *   // User is guaranteed to be a platform admin
 * }
 */
export async function requirePlatformAdmin(): Promise<AuthCheck> {
  const auth = await getAuthenticatedUser();
  if (!auth.success) return auth;

  if (!auth.user.isPlatformAdmin) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Platform admin access required', code: 'ADMIN_REQUIRED' },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/**
 * Require organization admin role.
 * Returns an error response if user is not an org admin.
 * Platform admins always pass this check.
 *
 * @param organizationId - Optional org ID to check membership against
 */
export async function requireOrgAdmin(organizationId?: string): Promise<AuthCheck> {
  const auth = await getAuthenticatedUser();
  if (!auth.success) return auth;

  // Platform admins always have access
  if (auth.user.isPlatformAdmin) return auth;

  // Check organization membership
  const targetOrgId = organizationId || auth.user.organizationId;

  if (!targetOrgId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Organization membership required', code: 'ORG_REQUIRED' },
        { status: 403 }
      ),
    };
  }

  if (auth.user.organizationId !== targetOrgId) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Not a member of this organization', code: 'ORG_MISMATCH' },
        { status: 403 }
      ),
    };
  }

  if (auth.user.role !== 'org_admin') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: Organization admin access required', code: 'ORG_ADMIN_REQUIRED' },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/**
 * Check if user can access a resource owned by another user.
 * Returns true for resource owners and platform admins.
 */
export function canAccessResource(
  user: AuthenticatedUser,
  resourceOwnerId: string,
  resourceOrgId?: string | null
): boolean {
  // User owns the resource
  if (user.id === resourceOwnerId) return true;

  // Platform admin can access anything
  if (user.isPlatformAdmin) return true;

  // Check organization membership
  if (resourceOrgId && user.organizationId === resourceOrgId) {
    return true;
  }

  return false;
}
