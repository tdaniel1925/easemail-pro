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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Store active connections per account for broadcasting
// Key: accountId, Value: Set of response controllers
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>();

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
  const supabase = createClient();
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
      if (!activeConnections.has(accountId)) {
        activeConnections.set(accountId, new Set());
      }
      activeConnections.get(accountId)!.add(controller);

      console.log(`🔌 SSE connected: ${accountId} (${activeConnections.get(accountId)!.size} active)`);

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
      const connections = activeConnections.get(accountId);
      if (connections) {
        connections.delete(controller);
        if (connections.size === 0) {
          activeConnections.delete(accountId);
        }
      }

      console.log(`🔌 SSE disconnected: ${accountId} (${activeConnections.get(accountId)?.size || 0} remaining)`);
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

/**
 * Broadcast an event to all connected clients for an account
 * Called from webhook handlers when email events occur
 */
export function broadcastToAccount(accountId: string, event: EmailSyncEvent): void {
  const connections = activeConnections.get(accountId);

  if (!connections || connections.size === 0) {
    console.log(`📡 No SSE clients connected for account ${accountId}`);
    return;
  }

  const encoder = new TextEncoder();
  const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  const encodedData = encoder.encode(eventData);

  let successCount = 0;
  const deadConnections: ReadableStreamDefaultController[] = [];

  connections.forEach((controller) => {
    try {
      controller.enqueue(encodedData);
      successCount++;
    } catch (error) {
      // Connection is dead, mark for removal
      deadConnections.push(controller);
    }
  });

  // Clean up dead connections
  deadConnections.forEach((controller) => {
    connections.delete(controller);
  });

  if (deadConnections.length > 0) {
    console.log(`🧹 Cleaned up ${deadConnections.length} dead SSE connections for ${accountId}`);
  }

  console.log(`📡 Broadcasted ${event.type} to ${successCount}/${connections.size} clients for ${accountId}`);
}

/**
 * Get the number of active connections for an account
 */
export function getActiveConnectionCount(accountId: string): number {
  return activeConnections.get(accountId)?.size || 0;
}

/**
 * Get all accounts with active SSE connections
 */
export function getConnectedAccounts(): string[] {
  return Array.from(activeConnections.keys());
}

// Types
export interface EmailSyncEvent {
  type: 'message.created' | 'message.updated' | 'message.deleted' | 'folder.updated' | 'sync.started' | 'sync.completed' | 'sync.progress';
  accountId: string;
  messageId?: string;
  folderId?: string;
  folder?: string;
  timestamp: number;
  data?: {
    subject?: string;
    fromEmail?: string;
    fromName?: string;
    snippet?: string;
    isRead?: boolean;
    isStarred?: boolean;
    syncProgress?: number;
    syncedCount?: number;
    totalCount?: number;
  };
}
