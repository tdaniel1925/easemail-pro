/**
 * Debug Endpoint Authentication Middleware
 *
 * Security wrapper for debug endpoints
 * - Blocks access in production (unless explicitly enabled)
 * - Requires authentication
 * - Requires platform_admin role
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function requireDebugAccess(request: NextRequest): Promise<{
  authorized: boolean;
  response?: NextResponse;
  userId?: string;
}> {
  // SECURITY: Block in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEBUG_ENDPOINTS !== 'true') {
    return {
      authorized: false,
      response: NextResponse.json({
        error: 'Debug endpoints are disabled in production',
        message: 'Set ENABLE_DEBUG_ENDPOINTS=true to enable (NOT RECOMMENDED)'
      }, { status: 403 })
    };
  }

  // SECURITY: Authenticate user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    };
  }

  // SECURITY: Verify user is platform admin
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!dbUser || dbUser.role !== 'platform_admin') {
    return {
      authorized: false,
      response: NextResponse.json({
        error: 'Forbidden - Platform admin access required'
      }, { status: 403 })
    };
  }

  return {
    authorized: true,
    userId: user.id
  };
}
