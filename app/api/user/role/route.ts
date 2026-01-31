import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';


export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user role from database
    const userRecord = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.id),
    });

    return NextResponse.json({
      role: userRecord?.role || 'individual',
      isAdmin: userRecord?.role === 'platform_admin' || userRecord?.role === 'org_admin',
    });
  } catch (error) {
    console.error('[API] Error fetching user role:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user role' },
      { status: 500 }
    );
  }
}
