/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Centralized authorization for API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type UserRole = 'platform_admin' | 'admin' | 'member' | 'viewer';

export interface AuthResult {
  authorized: boolean;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  response?: NextResponse;
}

/**
 * Require authentication only
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!dbUser) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 404 })
    };
  }

  return {
    authorized: true,
    user: {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role as UserRole,
    }
  };
}

/**
 * Require specific role or higher
 */
export async function requireRole(
  request: NextRequest,
  requiredRole: UserRole
): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authorized || !authResult.user) {
    return authResult;
  }

  const roleHierarchy: Record<UserRole, number> = {
    viewer: 1,
    member: 2,
    admin: 3,
    platform_admin: 4,
  };

  const userRoleLevel = roleHierarchy[authResult.user.role] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole] || 999;

  if (userRoleLevel < requiredRoleLevel) {
    return {
      authorized: false,
      response: NextResponse.json({
        error: 'Forbidden',
        message: `Requires ${requiredRole} role or higher`
      }, { status: 403 })
    };
  }

  return authResult;
}

/**
 * Require platform admin role
 */
export async function requirePlatformAdmin(request: NextRequest): Promise<AuthResult> {
  return requireRole(request, 'platform_admin');
}

/**
 * Require admin role
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  return requireRole(request, 'admin');
}

/**
 * Check if user owns a resource
 */
export async function requireOwnership(
  request: NextRequest,
  resourceUserId: string
): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authorized || !authResult.user) {
    return authResult;
  }

  // Platform admins can access any resource
  if (authResult.user.role === 'platform_admin') {
    return authResult;
  }

  // Regular users can only access their own resources
  if (authResult.user.id !== resourceUserId) {
    return {
      authorized: false,
      response: NextResponse.json({
        error: 'Forbidden',
        message: 'You can only access your own resources'
      }, { status: 403 })
    };
  }

  return authResult;
}
