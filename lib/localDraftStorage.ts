// localDraftStorage.ts - Fixed version with proper draft handling

export interface Draft {
  id: string;
  nylasId?: string;
  subject: string;
  body: string;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  attachments?: Array<any>;
  replyToMessageId?: string;
  syncStatus?: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  lastSynced?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'easemail_drafts';
const SYNC_QUEUE_KEY = 'easemail_draft_sync_queue';

class LocalDraftStorage {
  private cache: Map<string, Draft> = new Map();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const drafts: Draft[] = JSON.parse(stored);
        drafts.forEach(draft => {
          this.cache.set(draft.id, draft);
        });
      }
      this.initialized = true;
      console.log(`[LocalDraft] Loaded ${this.cache.size} drafts from storage`);
    } catch (error) {
      console.error('[LocalDraft] Failed to load from storage:', error);
      this.cache.clear();
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined') return;

      const drafts = Array.from(this.cache.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.error('[LocalDraft] Failed to save to storage:', error);
    }
  }

  create(draft: Omit<Draft, 'createdAt' | 'updatedAt'>): Draft {
    const now = new Date().toISOString();
    const newDraft: Draft = {
      ...draft,
      createdAt: now,
      updatedAt: now,
      syncStatus: draft.syncStatus || 'pending',
      to: draft.to || [],
      cc: draft.cc || [],
      bcc: draft.bcc || [],
    };

    this.cache.set(newDraft.id, newDraft);
    this.saveToStorage();
    console.log('[LocalDraft] Created draft:', newDraft.id);

    return newDraft;
  }

  get(draftId: string): Draft | null {
    return this.cache.get(draftId) || null;
  }

  getAll(): Draft[] {
    return Array.from(this.cache.values());
  }

  /**
   * Update a draft - now creates the draft if it doesn't exist and has sufficient data
   */
  update(draftId: string, updates: Partial<Draft>): Draft | null {
    let draft = this.get(draftId);

    if (!draft) {
      // Check if we have enough data to create a draft
      const hasMinimumData = updates.subject !== undefined ||
                            updates.body !== undefined ||
                            (updates.to && updates.to.length > 0);

      if (hasMinimumData) {
        console.log('[LocalDraft] Draft not found, creating new draft:', draftId);

        // Create a new draft with the updates
        draft = this.create({
          id: draftId,
          subject: updates.subject || '',
          body: updates.body || '',
          to: updates.to || [],
          cc: updates.cc || [],
          bcc: updates.bcc || [],
          nylasId: updates.nylasId,
          syncStatus: updates.syncStatus || 'pending',
          ...updates
        } as Omit<Draft, 'createdAt' | 'updatedAt'>);

        return draft;
      } else {
        // Not enough data to create, and draft doesn't exist
        console.warn('[LocalDraft] Draft not found and insufficient data to create:', draftId);
        return null;
      }
    }

    // Update existing draft
    const updatedDraft: Draft = {
      ...draft,
      ...updates,
      id: draft.id, // Preserve ID
      createdAt: draft.createdAt, // Preserve creation time
      updatedAt: new Date().toISOString(),
    };

    this.cache.set(draftId, updatedDraft);
    this.saveToStorage();

    return updatedDraft;
  }

  delete(draftId: string): boolean {
    const existed = this.cache.has(draftId);
    if (existed) {
      this.cache.delete(draftId);
      this.saveToStorage();
      console.log('[LocalDraft] Deleted draft:', draftId);
    }
    return existed;
  }

  /**
   * Get all drafts that need syncing
   */
  getDraftsToSync(): Draft[] {
    return this.getAll().filter(draft =>
      draft.syncStatus === 'pending' || draft.syncStatus === 'error'
    );
  }

  /**
   * Clear all drafts (useful for testing)
   */
  clear(): void {
    this.cache.clear();
    this.saveToStorage();
    console.log('[LocalDraft] Cleared all drafts');
  }

  /**
   * Get sync queue from storage
   */
  getSyncQueue(): string[] {
    try {
      if (typeof window === 'undefined') return [];

      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('[LocalDraft] Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Add draft to sync queue
   */
  addToSyncQueue(draftId: string): void {
    try {
      if (typeof window === 'undefined') return;

      const queue = this.getSyncQueue();
      if (!queue.includes(draftId)) {
        queue.push(draftId);
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('[LocalDraft] Failed to add to sync queue:', error);
    }
  }

  /**
   * Remove draft from sync queue
   */
  removeFromSyncQueue(draftId: string): void {
    try {
      if (typeof window === 'undefined') return;

      const queue = this.getSyncQueue();
      const filtered = queue.filter(id => id !== draftId);
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('[LocalDraft] Failed to remove from sync queue:', error);
    }
  }

  /**
   * Clear sync queue
   */
  clearSyncQueue(): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(SYNC_QUEUE_KEY);
    } catch (error) {
      console.error('[LocalDraft] Failed to clear sync queue:', error);
    }
  }
}

// Singleton instance
export const localDraftStorage = new LocalDraftStorage();
