import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// Debug endpoint to check user auth status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const adminClient = await createAdminClient();

    // Check Supabase Auth
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    // Check Database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    return NextResponse.json({
      email,
      supabaseAuth: authUser ? {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,
        created_at: authUser.created_at,
        user_metadata: authUser.user_metadata,
      } : null,
      database: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        accountStatus: dbUser.accountStatus,
        requirePasswordChange: dbUser.requirePasswordChange,
        tempPasswordExpiresAt: dbUser.tempPasswordExpiresAt,
        createdAt: dbUser.createdAt,
      } : null,
      match: authUser?.id === dbUser?.id,
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

