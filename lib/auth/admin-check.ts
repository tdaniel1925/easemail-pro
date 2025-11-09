/**
 * Admin Authorization Helpers
 *
 * Provides secure role-based access control for admin endpoints
 */

import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface AdminCheckResult {
  authorized: boolean;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: string;
  status?: number;
}

/**
 * Check if the current user is a platform admin
 * Used for highest-level administrative functions
 */
export async function checkPlatformAdmin(): Promise<AdminCheckResult> {
  try {
    // 1. Authenticate with Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        authorized: false,
        error: 'Unauthorized - Authentication required',
        status: 401,
      };
    }

    // 2. Check role in database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!dbUser) {
      return {
        authorized: false,
        error: 'User not found',
        status: 404,
      };
    }

    if (dbUser.role !== 'platform_admin') {
      return {
        authorized: false,
        error: 'Forbidden - Platform admin access required',
        status: 403,
      };
    }

    return {
      authorized: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      },
    };
  } catch (error) {
    console.error('[Admin Check] Platform admin check failed:', error);
    return {
      authorized: false,
      error: 'Failed to verify admin status',
      status: 500,
    };
  }
}

/**
 * Check if the current user is any type of admin
 * Used for general admin functions (platform_admin, org_admin, or legacy 'admin')
 */
export async function checkAdmin(): Promise<AdminCheckResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        authorized: false,
        error: 'Unauthorized - Authentication required',
        status: 401,
      };
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!dbUser) {
      return {
        authorized: false,
        error: 'User not found',
        status: 404,
      };
    }

    const adminRoles = ['platform_admin', 'org_admin', 'admin'];
    if (!adminRoles.includes(dbUser.role)) {
      return {
        authorized: false,
        error: 'Forbidden - Admin access required',
        status: 403,
      };
    }

    return {
      authorized: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      },
    };
  } catch (error) {
    console.error('[Admin Check] Admin check failed:', error);
    return {
      authorized: false,
      error: 'Failed to verify admin status',
      status: 500,
    };
  }
}

/**
 * Check if any platform admin exists in the system
 * Used during initial setup to determine if this is first-time initialization
 */
export async function checkPlatformAdminExists(): Promise<boolean> {
  try {
    const adminUser = await db.query.users.findFirst({
      where: eq(users.role, 'platform_admin'),
      columns: { id: true },
    });

    return !!adminUser;
  } catch (error) {
    console.error('[Admin Check] Failed to check for existing admin:', error);
    // On error, assume admin exists to prevent accidental setup
    return true;
  }
}
