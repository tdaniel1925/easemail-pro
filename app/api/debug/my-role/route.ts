import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check current user's role
 * GET /api/debug/my-role
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        authenticated: false 
      }, { status: 401 });
    }

    // Fetch from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    return NextResponse.json({
      authenticated: true,
      supabaseUser: {
        id: user.id,
        email: user.email,
      },
      databaseUser: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        organizationId: dbUser.organizationId,
        createdAt: dbUser.createdAt,
      } : null,
      checksPassed: {
        supabaseAuth: !!user,
        databaseUserExists: !!dbUser,
        isPlatformAdmin: dbUser?.role === 'platform_admin',
      },
    });
  } catch (error: any) {
    console.error('[Debug] Role check error:', error);
    return NextResponse.json({ 
      error: 'Failed to check role',
      details: error.message,
    }, { status: 500 });
  }
}

