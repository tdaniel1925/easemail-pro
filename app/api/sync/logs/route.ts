/**
 * Sync Logs API
 * GET /api/sync/logs?accountId={id}
 *
 * Returns recent sync operation logs for an account
 * Useful for user diagnostics and troubleshooting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { syncLogs, emailAccounts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get accountId from query params
    const searchParams = request.nextUrl.searchParams;
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId required' }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, accountId),
    });

    if (!account || account.userId !== user.id) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 403 });
    }

    // Get recent sync logs
    const logs = await db.query.syncLogs.findMany({
      where: eq(syncLogs.accountId, accountId),
      orderBy: [desc(syncLogs.startedAt)],
      limit: Math.min(limit, 100), // Max 100 logs
    });

    // Calculate summary stats
    const total = logs.length;
    const completed = logs.filter(l => l.status === 'completed').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const totalMessagesSynced = logs.reduce((sum, l) => sum + (l.messagesSynced || 0), 0);

    return NextResponse.json({
      success: true,
      accountId,
      logs,
      summary: {
        total,
        completed,
        failed,
        totalMessagesSynced,
      },
    });

  } catch (error: any) {
    console.error('Sync logs fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sync logs' },
      { status: 500 }
    );
  }
}
