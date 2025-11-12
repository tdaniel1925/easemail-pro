/**
 * Draft Sync Service
 * Handles background synchronization of local drafts to Nylas API
 * with retry logic and exponential backoff
 */

import { draftStorage, LocalDraft } from './localDraftStorage';

class DraftSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private syncCallbacks: Map<string, (success: boolean, error?: string) => void> = new Map();

  /**
   * Start the background sync service
   * Syncs every 10 seconds by default
   */
  start(intervalMs: number = 10000): void {
    if (this.syncInterval) {
      console.log('[DraftSync] Service already running');
      return;
    }

    console.log('[DraftSync] Starting background sync service');

    // Sync immediately on start
    this.sync();

    // Then sync periodically
    this.syncInterval = setInterval(() => {
      this.sync();
    }, intervalMs);
  }

  /**
   * Stop the background sync service
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[DraftSync] Stopped background sync service');
    }
  }

  /**
   * Manually trigger a sync
   */
  async sync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[DraftSync] Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;

    try {
      const pendingDrafts = draftStorage.getPendingSync();

      if (pendingDrafts.length === 0) {
        return;
      }

      console.log(`[DraftSync] Found ${pendingDrafts.length} drafts to sync`);

      // Process each draft sequentially to avoid overwhelming the API
      for (const draft of pendingDrafts) {
        await this.syncDraft(draft);
      }

      console.log('[DraftSync] Sync completed');
    } catch (error) {
      console.error('[DraftSync] Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single draft to Nylas API
   */
  private async syncDraft(draft: LocalDraft): Promise<void> {
    const startTime = Date.now();
    console.log(`[DraftSync] Syncing draft ${draft.id}...`);

    // Update status to syncing
    draftStorage.update(draft.id, {
      syncStatus: 'syncing',
      lastSyncAttempt: startTime,
    });

    try {
      // Call the Nylas API to save the draft
      const response = await fetch('/api/nylas-v3/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: draft.grantId,
          to: draft.to,
          cc: draft.cc,
          bcc: draft.bcc,
          subject: draft.subject,
          body: draft.body,
          replyToMessageId: draft.replyToMessageId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Sync successful
        const elapsedMs = Date.now() - startTime;
        console.log(`[DraftSync] ✅ Draft ${draft.id} synced successfully in ${elapsedMs}ms`);
        console.log(`[DraftSync] Nylas draft ID: ${data.draftId}`);

        draftStorage.update(draft.id, {
          syncStatus: 'synced',
          nylasId: data.draftId,
          error: undefined,
        });

        // Call success callback if registered
        const callback = this.syncCallbacks.get(draft.id);
        if (callback) {
          callback(true);
          this.syncCallbacks.delete(draft.id);
        }
      } else {
        // Sync failed
        throw new Error(data.error || 'Failed to sync draft');
      }
    } catch (error: any) {
      const elapsedMs = Date.now() - startTime;
      console.error(`[DraftSync] ❌ Failed to sync draft ${draft.id} after ${elapsedMs}ms:`, error.message);

      const newRetryCount = draft.retryCount + 1;

      // Update draft with failure status
      draftStorage.update(draft.id, {
        syncStatus: 'failed',
        retryCount: newRetryCount,
        error: error.message,
      });

      // Call error callback if registered
      const callback = this.syncCallbacks.get(draft.id);
      if (callback) {
        callback(false, error.message);
        // Don't delete callback - we might retry
      }

      // Log retry info
      if (newRetryCount < 5) {
        const backoffSeconds = Math.min(30, Math.pow(2, newRetryCount));
        console.log(`[DraftSync] Will retry draft ${draft.id} in ~${backoffSeconds}s (attempt ${newRetryCount + 1}/5)`);
      } else {
        console.error(`[DraftSync] Draft ${draft.id} failed permanently after ${newRetryCount} attempts`);
      }
    }
  }

  /**
   * Queue a draft for immediate sync (doesn't wait for next interval)
   * Returns a promise that resolves when sync completes
   */
  async queueForImmediateSync(draftId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Register callback for this draft
      this.syncCallbacks.set(draftId, (success: boolean, error?: string) => {
        resolve({ success, error });
      });

      // Trigger immediate sync
      setTimeout(() => {
        this.sync();
      }, 100); // Small delay to allow UI to update first
    });
  }

  /**
   * Force sync a specific draft immediately (bypassing queue)
   */
  async forceSyncDraft(draftId: string): Promise<{ success: boolean; error?: string }> {
    const draft = draftStorage.get(draftId);

    if (!draft) {
      return { success: false, error: 'Draft not found' };
    }

    try {
      await this.syncDraft(draft);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync status for a draft
   */
  getSyncStatus(draftId: string): LocalDraft | null {
    return draftStorage.get(draftId);
  }
}

// Singleton instance
export const draftSyncService = new DraftSyncService();

// Auto-start service when module is loaded (only in browser)
if (typeof window !== 'undefined') {
  // Start service after a short delay to avoid blocking initial page load
  setTimeout(() => {
    draftSyncService.start();
  }, 2000);

  // Stop service when page unloads
  window.addEventListener('beforeunload', () => {
    draftSyncService.stop();
  });
}
