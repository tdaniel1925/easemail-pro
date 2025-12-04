/**
 * MS Graph Accounts API
 *
 * GET /api/ms-graph/accounts
 * Returns all connected MS Teams accounts for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { msGraphAccounts } from '@/lib/db/schema-ms-teams';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all MS Teams accounts for this user
    const accounts = await db.query.msGraphAccounts.findMany({
      where: eq(msGraphAccounts.userId, user.id),
      columns: {
        id: true,
        email: true,
        displayName: true,
        userPrincipalName: true,
        isConnected: true,
        lastSyncedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error('[MS Graph Accounts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MS Teams accounts' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Delete the account (cascade will remove related data)
    await db.delete(msGraphAccounts)
      .where(eq(msGraphAccounts.id, accountId));

    return NextResponse.json({
      success: true,
      message: 'MS Teams account disconnected',
    });
  } catch (error) {
    console.error('[MS Graph Accounts] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect MS Teams account' },
      { status: 500 }
    );
  }
}
