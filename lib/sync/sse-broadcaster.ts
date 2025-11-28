/**
 * SSE Broadcasting Module
 *
 * Manages Server-Sent Events connections and broadcasts email updates
 * to connected clients in real-time (Gmail/Outlook-like behavior).
 */

// Store active connections per account for broadcasting
// Key: accountId, Value: Set of response controllers
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>();

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

/**
 * Add a connection to the active connections map
 */
export function addConnection(accountId: string, controller: ReadableStreamDefaultController): void {
  if (!activeConnections.has(accountId)) {
    activeConnections.set(accountId, new Set());
  }
  activeConnections.get(accountId)!.add(controller);
  console.log(`🔌 SSE connected: ${accountId} (${activeConnections.get(accountId)!.size} active)`);
}

/**
 * Remove a connection from the active connections map
 */
export function removeConnection(accountId: string, controller: ReadableStreamDefaultController): void {
  const connections = activeConnections.get(accountId);
  if (connections) {
    connections.delete(controller);
    if (connections.size === 0) {
      activeConnections.delete(accountId);
    }
  }
  console.log(`🔌 SSE disconnected: ${accountId} (${activeConnections.get(accountId)?.size || 0} remaining)`);
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

/**
 * Get total number of active connections across all accounts
 */
export function getTotalConnectionCount(): number {
  let total = 0;
  activeConnections.forEach((connections) => {
    total += connections.size;
  });
  return total;
}
