// Teams Sync API Route
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  syncAllTeamsAccountsForUser,
  syncTeamsAccount,
  incrementalSyncChat,
} from '@/lib/teams/teams-sync';
import { TeamsAccountRecord } from '@/lib/teams/teams-types';

// POST - Trigger sync for Teams accounts
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, chatId, syncType } = body;

    // Incremental sync for a specific chat
    if (chatId && accountId) {
      const result = await incrementalSyncChat(accountId, chatId);
      return NextResponse.json({ success: true, result });
    }

    // Full sync for a specific account
    if (accountId) {
      const account = await db
        .select()
        .from(teamsAccounts)
        .where(
          and(
            eq(teamsAccounts.id, accountId),
            eq(teamsAccounts.userId, user.id)
          )
        )
        .limit(1);

      if (!account.length) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }

      const result = await syncTeamsAccount(account[0] as TeamsAccountRecord);
      return NextResponse.json({ success: result.success, result });
    }

    // Sync all accounts for user
    const results = await syncAllTeamsAccountsForUser(user.id);
    const allSuccessful = results.every(r => r.success);

    return NextResponse.json({
      success: allSuccessful,
      results,
      summary: {
        accounts: results.length,
        totalChats: results.reduce((sum, r) => sum + r.chatsProcessed, 0),
        totalMessages: results.reduce((sum, r) => sum + r.messagesProcessed, 0),
        errors: results.flatMap(r => r.errors),
      },
    });
  } catch (error) {
    console.error('Teams sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

// GET - Get sync status
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const conditions = [eq(teamsAccounts.userId, user.id)];
    if (accountId) {
      conditions.push(eq(teamsAccounts.id, accountId));
    }

    const accounts = await db
      .select({
        id: teamsAccounts.id,
        email: teamsAccounts.email,
        syncStatus: teamsAccounts.syncStatus,
        lastSyncAt: teamsAccounts.lastSyncAt,
        lastError: teamsAccounts.lastError,
      })
      .from(teamsAccounts)
      .where(and(...conditions));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
