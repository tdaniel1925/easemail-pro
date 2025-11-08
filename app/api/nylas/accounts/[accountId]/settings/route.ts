import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Update Account Settings
 * PATCH /api/nylas/accounts/[accountId]/settings
 *
 * Updates account settings like autoSync, isActive, etc.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.accountId;
    const updates = await req.json();

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

    // Allowed settings to update
    const allowedUpdates: any = {};

    if (typeof updates.autoSync !== 'undefined') {
      allowedUpdates.autoSync = updates.autoSync;
    }

    if (typeof updates.isActive !== 'undefined') {
      allowedUpdates.isActive = updates.isActive;
    }

    if (typeof updates.syncFrequency !== 'undefined') {
      allowedUpdates.syncFrequency = updates.syncFrequency;
    }

    if (typeof updates.isDefault !== 'undefined') {
      allowedUpdates.isDefault = updates.isDefault;
    }

    allowedUpdates.updatedAt = new Date();

    // Update account settings
    await db.update(emailAccounts)
      .set(allowedUpdates)
      .where(eq(emailAccounts.id, accountId));

    console.log(`⚙️ Settings updated for account: ${account.emailAddress}`, allowedUpdates);

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      updates: allowedUpdates,
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * Get Account Settings
 * GET /api/nylas/accounts/[accountId]/settings
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.accountId;

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get account
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, accountId),
        eq(emailAccounts.userId, dbUser.id)
      ),
      columns: {
        autoSync: true,
        isActive: true,
        syncFrequency: true,
        isDefault: true,
        syncStopped: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: account,
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get settings' },
      { status: 500 }
    );
  }
}
