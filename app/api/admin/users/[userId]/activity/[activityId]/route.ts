import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, userActivityLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// PATCH: Update activity log (mainly for flagging/unflagging)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string; activityId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    const { userId, activityId } = params;
    const body = await request.json();

    const { isFlagged } = body;

    // Update activity log
    const [updated] = await db
      .update(userActivityLogs)
      .set({ isFlagged })
      .where(
        and(
          eq(userActivityLogs.id, activityId),
          eq(userActivityLogs.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Activity log not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, activity: updated });
  } catch (error) {
    console.error('Activity log update error:', error);
    return NextResponse.json({ error: 'Failed to update activity log' }, { status: 500 });
  }
}
