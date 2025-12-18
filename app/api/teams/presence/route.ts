// Teams Presence API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTeamsPresence } from '@/lib/teams/teams-sync';

export const dynamic = 'force-dynamic';

// GET - Get presence status for users
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds')?.split(',').filter(Boolean);
    const accountId = searchParams.get('accountId');

    if (!userIds?.length) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }

    // Get the Teams account
    let account;
    if (accountId) {
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.id, accountId),
            eq(teamsAccounts.userId, user.id)
          )
        )
        .limit(1);
    } else {
      // Get the first active Teams account for the user
      account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.userId, user.id),
            eq(teamsAccounts.isActive, true)
          )
        )
        .limit(1);
    }

    if (!account?.length) {
      return NextResponse.json({ error: 'Teams account not found' }, { status: 404 });
    }

    const result = await getTeamsPresence(account[0].id, userIds);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      presence: result.presence,
    });
  } catch (error) {
    console.error('Error fetching Teams presence:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch presence' },
      { status: 500 }
    );
  }
}
