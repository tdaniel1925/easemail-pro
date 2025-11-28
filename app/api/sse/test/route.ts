/**
 * SSE Test Endpoint
 *
 * Provides a simple way to test SSE connectivity and broadcasting.
 * Useful for debugging and verifying the real-time system works.
 *
 * GET /api/sse/test - Returns SSE connection stats
 * POST /api/sse/test - Broadcasts a test event to an account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  broadcastToAccount,
  getActiveConnectionCount,
  getConnectedAccounts,
  type EmailSyncEvent,
} from '@/app/api/sse/emails/route';

export const dynamic = 'force-dynamic';

/**
 * GET - Get SSE connection statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { role: true },
    });

    const isAdmin = dbUser?.role === 'platform_admin';

    // Get user's accounts
    const userAccounts = await db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, user.id),
      columns: { id: true, emailAddress: true },
    });

    // Get connection stats for user's accounts
    const accountStats = userAccounts.map((account) => ({
      accountId: account.id,
      emailAddress: account.emailAddress,
      activeConnections: getActiveConnectionCount(account.id),
    }));

    const response: any = {
      success: true,
      userAccounts: accountStats,
      totalUserConnections: accountStats.reduce((sum, a) => sum + a.activeConnections, 0),
    };

    // Admin gets system-wide stats
    if (isAdmin) {
      const connectedAccounts = getConnectedAccounts();
      response.system = {
        totalConnectedAccounts: connectedAccounts.length,
        connectedAccountIds: connectedAccounts,
        totalConnections: connectedAccounts.reduce(
          (sum, id) => sum + getActiveConnectionCount(id),
          0
        ),
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SSE Test] Error:', error);
    return NextResponse.json({
      error: 'Failed to get SSE stats',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * POST - Broadcast a test event to verify SSE is working
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, eventType = 'message.created' } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await db.query.emailAccounts.findFirst({
      where: and(
        eq(emailAccounts.id, accountId),
        eq(emailAccounts.userId, user.id)
      ),
      columns: { id: true, emailAddress: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check if there are active connections
    const connectionCount = getActiveConnectionCount(accountId);

    if (connectionCount === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active SSE connections for this account',
        suggestion: 'Open the inbox in another tab to establish an SSE connection',
        connectionCount: 0,
      });
    }

    // Broadcast a test event
    const testEvent: EmailSyncEvent = {
      type: eventType as any,
      accountId,
      messageId: `test-${Date.now()}`,
      timestamp: Date.now(),
      data: {
        subject: '🧪 SSE Test Message',
        fromEmail: 'test@easemail.app',
        fromName: 'EaseMail Test',
        snippet: 'This is a test message to verify SSE connectivity is working correctly.',
        isRead: false,
      },
    };

    broadcastToAccount(accountId, testEvent);

    return NextResponse.json({
      success: true,
      message: `Test event broadcasted to ${connectionCount} connection(s)`,
      event: testEvent,
      connectionCount,
    });
  } catch (error) {
    console.error('[SSE Test] Error:', error);
    return NextResponse.json({
      error: 'Failed to broadcast test event',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
