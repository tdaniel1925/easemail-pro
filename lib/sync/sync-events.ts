/**
 * Email Sync Event Service
 *
 * Centralized event broadcasting for email sync operations.
 * Used to notify clients via SSE when:
 * - Sync starts/completes
 * - Progress updates during sync
 * - Errors occur
 *
 * This provides Gmail/Outlook-like real-time sync status visibility.
 */

import { broadcastToAccount, type EmailSyncEvent } from '@/app/api/sse/emails/route';

/**
 * Broadcast that sync has started for an account
 */
export function broadcastSyncStarted(accountId: string): void {
  const event: EmailSyncEvent = {
    type: 'sync.started',
    accountId,
    timestamp: Date.now(),
    data: {
      syncProgress: 0,
    },
  };

  broadcastToAccount(accountId, event);
  console.log(`📡 Broadcast: Sync started for ${accountId}`);
}

/**
 * Broadcast sync progress update
 */
export function broadcastSyncProgress(
  accountId: string,
  progress: number,
  syncedCount: number,
  totalCount?: number
): void {
  const event: EmailSyncEvent = {
    type: 'sync.progress',
    accountId,
    timestamp: Date.now(),
    data: {
      syncProgress: Math.min(progress, 100),
      syncedCount,
      totalCount,
    },
  };

  broadcastToAccount(accountId, event);

  // Only log every 10% to reduce noise
  if (progress % 10 === 0 || progress >= 100) {
    console.log(`📡 Broadcast: Sync progress ${progress}% for ${accountId} (${syncedCount} emails)`);
  }
}

/**
 * Broadcast that sync has completed
 */
export function broadcastSyncCompleted(
  accountId: string,
  syncedCount: number,
  durationMs?: number
): void {
  const event: EmailSyncEvent = {
    type: 'sync.completed',
    accountId,
    timestamp: Date.now(),
    data: {
      syncProgress: 100,
      syncedCount,
    },
  };

  broadcastToAccount(accountId, event);
  console.log(`📡 Broadcast: Sync completed for ${accountId} (${syncedCount} emails${durationMs ? `, ${Math.round(durationMs / 1000)}s` : ''})`);
}

/**
 * Broadcast a new email arrival (convenience wrapper)
 */
export function broadcastNewEmail(
  accountId: string,
  messageId: string,
  options: {
    subject?: string;
    fromEmail?: string;
    fromName?: string;
    snippet?: string;
    folder?: string;
  }
): void {
  const event: EmailSyncEvent = {
    type: 'message.created',
    accountId,
    messageId,
    folder: options.folder,
    timestamp: Date.now(),
    data: {
      subject: options.subject,
      fromEmail: options.fromEmail,
      fromName: options.fromName,
      snippet: options.snippet,
      isRead: false,
    },
  };

  broadcastToAccount(accountId, event);
}

/**
 * Broadcast email status change (read/starred/etc)
 */
export function broadcastEmailUpdated(
  accountId: string,
  messageId: string,
  updates: {
    isRead?: boolean;
    isStarred?: boolean;
  }
): void {
  const event: EmailSyncEvent = {
    type: 'message.updated',
    accountId,
    messageId,
    timestamp: Date.now(),
    data: updates,
  };

  broadcastToAccount(accountId, event);
}

/**
 * Broadcast email deletion
 */
export function broadcastEmailDeleted(accountId: string, messageId: string): void {
  const event: EmailSyncEvent = {
    type: 'message.deleted',
    accountId,
    messageId,
    timestamp: Date.now(),
  };

  broadcastToAccount(accountId, event);
}

/**
 * Broadcast folder update (counts, new folder, etc)
 */
export function broadcastFolderUpdated(
  accountId: string,
  folderId: string,
  folderName?: string
): void {
  const event: EmailSyncEvent = {
    type: 'folder.updated',
    accountId,
    folderId,
    folder: folderName,
    timestamp: Date.now(),
  };

  broadcastToAccount(accountId, event);
}
