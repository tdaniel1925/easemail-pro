// draftSyncService.ts - Fixed version with debouncing, timeout handling, and proper error management

import { localDraftStorage, Draft } from './localDraftStorage';

interface LocalDraft extends Draft {
  grantId?: string; // Grant ID for Nylas API
}

interface DraftSyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  lastSync?: Date;
  error?: string;
}

class DraftSyncService {
  private draftsToSync: Map<string, LocalDraft> = new Map();
  private syncInProgress = false;
  private syncTimers: Map<string, NodeJS.Timeout> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();
  private syncStatus: Map<string, DraftSyncStatus> = new Map();

  private readonly MAX_RETRIES = 5;
  private readonly DEBOUNCE_MS = 1000; // 1 second debounce to prevent rapid syncs
  private readonly TIMEOUT_MS = 10000; // 10 second timeout for API calls
  private readonly MIN_RETRY_DELAY = 2000; // 2 seconds minimum
  private readonly MAX_RETRY_DELAY = 30000; // 30 seconds maximum

  constructor() {
    this.initializeFromLocalStorage();
  }

  /**
   * Initialize sync queue from local storage on startup
   */
  private initializeFromLocalStorage(): void {
    const draftsToSync = localDraftStorage.getDraftsToSync();
    console.log(`[DraftSync] Initialized with ${draftsToSync.length} drafts to sync`);

    draftsToSync.forEach(draft => {
      this.queueDraftForSync(draft as LocalDraft);
    });
  }

  /**
   * Queue a draft for syncing with debouncing to prevent excessive API calls
   */
  queueDraftForSync(draft: LocalDraft): void {
    // Clear existing debounce timer for this draft
    const existingTimer = this.syncTimers.get(draft.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.draftsToSync.set(draft.id, draft);
      localDraftStorage.addToSyncQueue(draft.id);
      this.syncTimers.delete(draft.id);

      // Trigger sync
      this.sync();
    }, this.DEBOUNCE_MS);

    this.syncTimers.set(draft.id, timer);
    console.log(`[DraftSync] Queued draft ${draft.id} for sync in ${this.DEBOUNCE_MS}ms`);
  }

  /**
   * Main sync function - processes all queued drafts
   */
  async sync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[DraftSync] Sync already in progress, skipping');
      return;
    }

    if (this.draftsToSync.size === 0) {
      console.log('[DraftSync] No drafts to sync');
      return;
    }

    this.syncInProgress = true;
    console.log(`[DraftSync] Found ${this.draftsToSync.size} drafts to sync`);

    // Process each draft sequentially to avoid overwhelming the API
    for (const [draftId, draft] of Array.from(this.draftsToSync.entries())) {
      // Skip if already being retried
      if (this.retryTimers.has(draftId)) {
        console.log(`[DraftSync] Skipping ${draftId} - retry already scheduled`);
        continue;
      }

      await this.syncDraft(draft);

      // Remove from queue if successful or max retries reached
      const status = this.syncStatus.get(draftId);
      if (status?.status === 'completed') {
        this.draftsToSync.delete(draftId);
        localDraftStorage.removeFromSyncQueue(draftId);
      }
    }

    this.syncInProgress = false;
    console.log('[DraftSync] Sync completed');
  }

  /**
   * Sync a single draft with timeout and retry logic
   */
  async syncDraft(draft: LocalDraft, attempt: number = 1): Promise<void> {
    const startTime = Date.now();

    try {
      // Ensure draft exists in local storage before updating
      const existingDraft = localDraftStorage.get(draft.id);
      if (!existingDraft) {
        console.warn(`[DraftSync] Draft ${draft.id} not found in local storage, creating it`);
        localDraftStorage.create(draft);
      }

      this.updateDraftStatus(draft.id, 'syncing');
      console.log(`[DraftSync] Syncing draft ${draft.id}...`);

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), this.TIMEOUT_MS);
      });

      // Call the Nylas API via our API route
      const apiPromise = this.callDraftsAPI(draft);

      // Race between API call and timeout
      const response = await Promise.race([
        apiPromise,
        timeoutPromise
      ]);

      const duration = Date.now() - startTime;

      if (!response.success) {
        throw new Error(response.error || 'Failed to sync draft');
      }

      // Update local storage with Nylas ID
      const updated = localDraftStorage.update(draft.id, {
        nylasId: response.draftId,
        lastSynced: new Date().toISOString(),
        syncStatus: 'synced',
        syncError: undefined
      });

      if (!updated) {
        throw new Error('Failed to update draft in local storage');
      }

      this.updateDraftStatus(draft.id, 'completed');
      console.log(`[DraftSync] ✅ Draft ${draft.id} synced successfully in ${duration}ms`);
      console.log(`[DraftSync] Nylas draft ID: ${response.draftId}`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);

      console.error(`[DraftSync] ❌ Failed to sync draft ${draft.id} after ${duration}ms:`, errorMessage);

      // Update draft with error status
      localDraftStorage.update(draft.id, {
        syncStatus: 'error',
        syncError: errorMessage
      });

      // Handle retries with exponential backoff
      if (attempt < this.MAX_RETRIES) {
        this.scheduleRetry(draft, attempt + 1);
      } else {
        this.updateDraftStatus(draft.id, 'error', errorMessage);
        console.error(`[DraftSync] Max retries reached for draft ${draft.id}`);

        // Remove from active sync queue after max retries
        this.draftsToSync.delete(draft.id);
        localDraftStorage.removeFromSyncQueue(draft.id);

        // Notify user (could emit event here)
        this.notifyUserOfSyncFailure(draft.id, errorMessage);
      }
    }
  }

  /**
   * Call the Nylas drafts API
   */
  private async callDraftsAPI(draft: LocalDraft): Promise<any> {
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private scheduleRetry(draft: LocalDraft, attempt: number): void {
    // Clear any existing retry timer
    const existingRetryTimer = this.retryTimers.get(draft.id);
    if (existingRetryTimer) {
      clearTimeout(existingRetryTimer);
    }

    // Calculate retry delay with exponential backoff: 2s, 4s, 8s, 16s, 30s
    const baseDelay = this.MIN_RETRY_DELAY;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const retryDelay = Math.min(exponentialDelay, this.MAX_RETRY_DELAY);

    console.log(`[DraftSync] Will retry draft ${draft.id} in ~${retryDelay / 1000}s (attempt ${attempt}/${this.MAX_RETRIES})`);

    const retryTimer = setTimeout(() => {
      this.retryTimers.delete(draft.id);
      this.syncDraft(draft, attempt);
    }, retryDelay);

    this.retryTimers.set(draft.id, retryTimer);
  }

  /**
   * Update draft status in memory
   */
  private updateDraftStatus(draftId: string, status: 'idle' | 'syncing' | 'completed' | 'error', error?: string): void {
    const currentStatus = this.syncStatus.get(draftId) || { status: 'idle' };

    this.syncStatus.set(draftId, {
      ...currentStatus,
      status,
      lastSync: new Date(),
      error
    });

    // Also update in local storage
    const existingDraft = localDraftStorage.get(draftId);
    if (!existingDraft) {
      console.warn(`[DraftSync] Cannot update status for non-existent draft: ${draftId}`);
      return;
    }

    const syncStatus = status === 'completed' ? 'synced' :
                      status === 'syncing' ? 'syncing' :
                      status === 'error' ? 'error' : 'pending';

    localDraftStorage.update(draftId, {
      syncStatus,
      syncError: error,
      lastSynced: status === 'completed' ? new Date().toISOString() : existingDraft.lastSynced
    });
  }

  /**
   * Get error message from various error types
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    return 'Unknown error';
  }

  /**
   * Notify user of sync failure (implement based on your notification system)
   */
  private notifyUserOfSyncFailure(draftId: string, error: string): void {
    // Implement your notification logic here
    // For example: toast notification, in-app alert, etc.
    console.warn(`[DraftSync] 🔔 User notification: Draft ${draftId} failed to sync after ${this.MAX_RETRIES} attempts: ${error}`);

    // Example: could emit an event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('draft-sync-failed', {
        detail: { draftId, error }
      }));
    }
  }

  /**
   * Get sync status for a specific draft
   */
  getSyncStatus(draftId: string): DraftSyncStatus {
    return this.syncStatus.get(draftId) || { status: 'idle' };
  }

  /**
   * Cancel all pending syncs and timers
   */
  cancelAllSyncs(): void {
    // Clear all debounce timers
    this.syncTimers.forEach(timer => clearTimeout(timer));
    this.syncTimers.clear();

    // Clear all retry timers
    this.retryTimers.forEach(timer => clearTimeout(timer));
    this.retryTimers.clear();

    // Clear sync queue
    this.draftsToSync.clear();
    localDraftStorage.clearSyncQueue();

    this.syncInProgress = false;
    console.log('[DraftSync] Cancelled all pending syncs');
  }

  /**
   * Force sync a specific draft immediately (bypass debouncing)
   */
  async forceSyncDraft(draftId: string): Promise<void> {
    const draft = localDraftStorage.get(draftId);
    if (!draft) {
      throw new Error(`Draft ${draftId} not found`);
    }

    // Clear any existing timers for this draft
    const timer = this.syncTimers.get(draftId);
    if (timer) {
      clearTimeout(timer);
      this.syncTimers.delete(draftId);
    }

    const retryTimer = this.retryTimers.get(draftId);
    if (retryTimer) {
      clearTimeout(retryTimer);
      this.retryTimers.delete(draftId);
    }

    // Sync immediately
    await this.syncDraft(draft as LocalDraft);
  }

  /**
   * Get all drafts currently queued for sync
   */
  getQueuedDrafts(): LocalDraft[] {
    return Array.from(this.draftsToSync.values());
  }

  /**
   * Retry failed drafts
   */
  retryFailedDrafts(): void {
    const failedDrafts = localDraftStorage.getAll().filter(d => d.syncStatus === 'error');
    console.log(`[DraftSync] Retrying ${failedDrafts.length} failed drafts`);

    failedDrafts.forEach(draft => {
      this.queueDraftForSync(draft as LocalDraft);
    });
  }

  /**
   * Queue a draft for immediate sync (for compatibility with existing code)
   */
  async queueForImmediateSync(draftId: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const draft = localDraftStorage.get(draftId);
      if (!draft) {
        resolve({ success: false, error: 'Draft not found' });
        return;
      }

      // Queue the draft
      this.queueDraftForSync(draft as LocalDraft);

      // Wait a bit and check status
      setTimeout(() => {
        const status = this.getSyncStatus(draftId);
        if (status.status === 'completed') {
          resolve({ success: true });
        } else if (status.status === 'error') {
          resolve({ success: false, error: status.error });
        } else {
          // Still syncing or pending
          resolve({ success: false, error: 'Sync in progress' });
        }
      }, 5000); // Wait 5 seconds max
    });
  }
}

// Singleton instance
export const draftSyncService = new DraftSyncService();

// Auto-start periodic sync (every 10 seconds)
if (typeof window !== 'undefined') {
  setInterval(() => {
    draftSyncService.sync();
  }, 10000);
}

export { type LocalDraft, type DraftSyncStatus };
