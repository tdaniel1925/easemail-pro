/**
 * Local Draft Storage
 * Provides localStorage-based draft persistence for instant saves
 * with background sync to Nylas API
 */

export interface LocalDraft {
  id: string;
  grantId: string;
  to: any[];
  subject: string;
  body: string;
  cc?: any[];
  bcc?: any[];
  replyToMessageId?: string;
  nylasId?: string; // Set after successful sync to Nylas
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  lastModified: number;
  lastSyncAttempt?: number;
  retryCount: number;
  error?: string;
}

const DRAFT_PREFIX = 'draft_';
const MAX_DRAFTS = 100; // Limit storage to prevent filling up localStorage

export const draftStorage = {
  /**
   * Save a draft locally (instant, no API call)
   * Returns the local draft ID
   */
  save: (draft: Omit<LocalDraft, 'id' | 'lastModified' | 'syncStatus' | 'retryCount'>): LocalDraft => {
    try {
      // Generate unique ID if not already set
      const id = draft.nylasId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const localDraft: LocalDraft = {
        ...draft,
        id,
        syncStatus: 'pending',
        lastModified: Date.now(),
        retryCount: 0,
      };

      localStorage.setItem(`${DRAFT_PREFIX}${id}`, JSON.stringify(localDraft));

      // Clean up old drafts if we exceed the limit
      draftStorage.cleanup();

      console.log('[LocalDraft] Saved draft locally:', id);
      return localDraft;
    } catch (error) {
      console.error('[LocalDraft] Failed to save draft locally:', error);
      throw error;
    }
  },

  /**
   * Update an existing draft
   */
  update: (id: string, updates: Partial<LocalDraft>): LocalDraft | null => {
    try {
      const draft = draftStorage.get(id);
      if (!draft) {
        console.warn('[LocalDraft] Draft not found for update:', id);
        return null;
      }

      const updatedDraft: LocalDraft = {
        ...draft,
        ...updates,
        id, // Preserve ID
        lastModified: Date.now(),
      };

      localStorage.setItem(`${DRAFT_PREFIX}${id}`, JSON.stringify(updatedDraft));
      console.log('[LocalDraft] Updated draft:', id);
      return updatedDraft;
    } catch (error) {
      console.error('[LocalDraft] Failed to update draft:', error);
      return null;
    }
  },

  /**
   * Get a draft by ID
   */
  get: (id: string): LocalDraft | null => {
    try {
      const key = id.startsWith(DRAFT_PREFIX) ? id : `${DRAFT_PREFIX}${id}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data) as LocalDraft;
    } catch (error) {
      console.error('[LocalDraft] Failed to get draft:', error);
      return null;
    }
  },

  /**
   * Get all drafts for a specific account
   */
  getByGrantId: (grantId: string): LocalDraft[] => {
    try {
      const drafts: LocalDraft[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            const draft = JSON.parse(data) as LocalDraft;
            if (draft.grantId === grantId) {
              drafts.push(draft);
            }
          }
        }
      }

      // Sort by last modified (newest first)
      return drafts.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.error('[LocalDraft] Failed to get drafts by grant ID:', error);
      return [];
    }
  },

  /**
   * Get all drafts that need syncing (pending or failed with retry count < 5)
   */
  getPendingSync: (): LocalDraft[] => {
    try {
      const drafts: LocalDraft[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            const draft = JSON.parse(data) as LocalDraft;
            if (
              (draft.syncStatus === 'pending' ||
               (draft.syncStatus === 'failed' && draft.retryCount < 5)) &&
              draft.syncStatus !== 'syncing'
            ) {
              drafts.push(draft);
            }
          }
        }
      }

      // Sort by last modified (oldest first for FIFO processing)
      return drafts.sort((a, b) => a.lastModified - b.lastModified);
    } catch (error) {
      console.error('[LocalDraft] Failed to get pending drafts:', error);
      return [];
    }
  },

  /**
   * Delete a draft
   */
  delete: (id: string): void => {
    try {
      const key = id.startsWith(DRAFT_PREFIX) ? id : `${DRAFT_PREFIX}${id}`;
      localStorage.removeItem(key);
      console.log('[LocalDraft] Deleted draft:', id);
    } catch (error) {
      console.error('[LocalDraft] Failed to delete draft:', error);
    }
  },

  /**
   * Clean up old drafts to prevent filling localStorage
   * Keeps the 100 most recent drafts
   */
  cleanup: (): void => {
    try {
      const drafts: { key: string; draft: LocalDraft }[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            drafts.push({ key, draft: JSON.parse(data) });
          }
        }
      }

      // Sort by last modified (newest first)
      drafts.sort((a, b) => b.draft.lastModified - a.draft.lastModified);

      // Remove drafts beyond the limit
      if (drafts.length > MAX_DRAFTS) {
        const toRemove = drafts.slice(MAX_DRAFTS);
        toRemove.forEach(({ key }) => {
          localStorage.removeItem(key);
          console.log('[LocalDraft] Cleaned up old draft:', key);
        });
      }
    } catch (error) {
      console.error('[LocalDraft] Failed to cleanup drafts:', error);
    }
  },

  /**
   * Clear all drafts (useful for testing or account logout)
   */
  clear: (grantId?: string): void => {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(DRAFT_PREFIX)) {
          if (grantId) {
            const data = localStorage.getItem(key);
            if (data) {
              const draft = JSON.parse(data) as LocalDraft;
              if (draft.grantId === grantId) {
                keysToRemove.push(key);
              }
            }
          } else {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`[LocalDraft] Cleared ${keysToRemove.length} drafts`);
    } catch (error) {
      console.error('[LocalDraft] Failed to clear drafts:', error);
    }
  },
};
