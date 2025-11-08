import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resume Account Sync
 * POST /api/nylas/sync/resume
 *
 * Resumes sync for a paused account by clearing syncStopped flag
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await req.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, accountId),
        eq(emailAccounts.userId, dbUser.id)
      ),
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Update account to resume sync
    await db.update(emailAccounts)
      .set({
        syncStopped: false,
        updatedAt: new Date(),
      })
      .where(eq(emailAccounts.id, accountId));

    console.log(`▶️ Sync resumed for account: ${account.emailAddress}`);

    return NextResponse.json({
      success: true,
      message: 'Sync resumed successfully - ready to sync',
    });
  } catch (error: any) {
    console.error('Resume sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resume sync' },
      { status: 500 }
    );
  }
}
