// Teams Accounts API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - List all Teams accounts for the user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await db
      .select({
        id: teamsAccounts.id,
        email: teamsAccounts.email,
        displayName: teamsAccounts.displayName,
        syncStatus: teamsAccounts.syncStatus,
        lastSyncAt: teamsAccounts.lastSyncAt,
        lastError: teamsAccounts.lastError,
        isActive: teamsAccounts.isActive,
        autoSync: teamsAccounts.autoSync,
        createdAt: teamsAccounts.createdAt,
      })
      .from(teamsAccounts)
      .where(eq(teamsAccounts.userId, user.id));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching Teams accounts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect a Teams account
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Verify ownership and delete
    const result = await db
      .delete(teamsAccounts)
      .where(
        and(
          eq(teamsAccounts.id, accountId),
          eq(teamsAccounts.userId, user.id)
        )
      )
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Teams account disconnected' });
  } catch (error) {
    console.error('Error deleting Teams account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}

// PATCH - Update account settings
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, autoSync, isActive } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (typeof autoSync === 'boolean') updateData.autoSync = autoSync;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const result = await db
      .update(teamsAccounts)
      .set(updateData)
      .where(
        and(
          eq(teamsAccounts.id, accountId),
          eq(teamsAccounts.userId, user.id)
        )
      )
      .returning();

    if (!result.length) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, account: result[0] });
  } catch (error) {
    console.error('Error updating Teams account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update account' },
      { status: 500 }
    );
  }
}
