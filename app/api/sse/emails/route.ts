/**
 * Server-Sent Events (SSE) Endpoint for Real-time Email Updates
 *
 * This endpoint provides Gmail/Outlook-like real-time email notifications
 * without requiring client polling. Clients receive instant updates when:
 * - New emails arrive
 * - Emails are read/unread/starred
 * - Emails are moved/deleted
 * - Folders are updated
 *
 * Usage:
 *   const eventSource = new EventSource('/api/sse/emails?accountId=xxx');
 *   eventSource.onmessage = (event) => { ... };
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { addConnection, removeConnection } from '@/lib/sync/sse-broadcaster';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Connection timeout (5 minutes - Vercel limit)
const CONNECTION_TIMEOUT = 4.5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get('accountId');

  if (!accountId) {
    return new Response('Missing accountId parameter', { status: 400 });
  }

  // Verify user authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Verify the account belongs to the user
  const account = await db.query.emailAccounts.findFirst({
    where: and(
      eq(emailAccounts.id, accountId),
      eq(emailAccounts.userId, user.id)
    ),
    columns: { id: true },
  });

  if (!account) {
    return new Response('Account not found or access denied', { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;
  let heartbeatInterval: NodeJS.Timeout;
  let timeoutTimer: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Add this connection to active connections
      addConnection(accountId, controller);

      // Send initial connection confirmation
      const connectEvent = `event: connected\ndata: ${JSON.stringify({
        accountId,
        timestamp: Date.now(),
        message: 'Real-time email updates enabled',
      })}\n\n`;
      controller.enqueue(encoder.encode(connectEvent));

      // Start heartbeat to keep connection alive
      heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `:heartbeat ${Date.now()}\n\n`;
          controller.enqueue(encoder.encode(heartbeat));
        } catch (error) {
          // Connection closed
          clearInterval(heartbeatInterval);
        }
      }, HEARTBEAT_INTERVAL);

      // Set connection timeout (Vercel has 5-minute limit)
      timeoutTimer = setTimeout(() => {
        try {
          const timeoutEvent = `event: timeout\ndata: ${JSON.stringify({
            message: 'Connection timeout - please reconnect',
            timestamp: Date.now(),
          })}\n\n`;
          controller.enqueue(encoder.encode(timeoutEvent));
          controller.close();
        } catch (error) {
          // Already closed
        }
      }, CONNECTION_TIMEOUT);
    },

    cancel() {
      // Clean up on disconnect
      clearInterval(heartbeatInterval);
      clearTimeout(timeoutTimer);

      // Remove from active connections
      removeConnection(accountId, controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
