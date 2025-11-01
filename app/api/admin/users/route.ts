import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, emailAccounts } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

// GET: List all users (admin only)
export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Fetch all users with email account counts
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        emailAccountCount: sql<number>`count(${emailAccounts.id})::int`,
      })
      .from(users)
      .leftJoin(emailAccounts, eq(users.id, emailAccounts.userId))
      .groupBy(users.id)
      .orderBy(users.createdAt);

    // Transform to include _count
    const usersWithCounts = allUsers.map(u => ({
      ...u,
      _count: {
        emailAccounts: u.emailAccountCount,
      },
    }));

    return NextResponse.json({ success: true, users: usersWithCounts });
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

