/**
 * Folder Cache Manager
 * 
 * In-memory caching for folders with background refresh
 * Dramatically reduces API calls and improves perceived performance
 */

interface CachedFolders {
  folders: any[];
  counts: Record<string, { totalCount: number; unreadCount: number }>;
  timestamp: number;
  accountId: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  backgroundRefresh?: boolean; // Refresh in background when stale
}

class FolderCacheManager {
  private cache: Map<string, CachedFolders> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 minutes default
  private backgroundRefreshEnabled: boolean = true;
  private refreshing: Set<string> = new Set();

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || this.ttl;
    this.backgroundRefreshEnabled = options.backgroundRefresh !== false;
  }

  /**
   * Get folders from cache or fetch if not cached
   * ✅ FIX #3: Validate cached account ID matches requested account ID
   */
  async getFolders(accountId: string): Promise<CachedFolders | null> {
    const cached = this.cache.get(accountId);
    const now = Date.now();

    // ✅ FIX #3: Double-check account ID matches (defense in depth)
    if (cached && cached.accountId !== accountId) {
      console.warn('⚠️ Cache accountId mismatch! Invalidating:', {
        requested: accountId,
        cached: cached.accountId,
      });
      this.cache.delete(accountId);
      return null;
    }

    // Cache hit and fresh
    if (cached && now - cached.timestamp < this.ttl) {
      console.log('📦 Folder cache HIT:', accountId);
      return cached;
    }

    // Cache hit but stale - return stale data and refresh in background
    if (cached && this.backgroundRefreshEnabled && !this.refreshing.has(accountId)) {
      console.log('📦 Folder cache STALE - returning cached + refreshing:', accountId);
      this.refreshInBackground(accountId);
      return cached;
    }

    // Cache miss
    console.log('📦 Folder cache MISS:', accountId);
    return null;
  }

  /**
   * Set folders in cache
   */
  setFolders(accountId: string, folders: any[], counts: Record<string, any>): void {
    const cached: CachedFolders = {
      folders,
      counts,
      timestamp: Date.now(),
      accountId,
    };

    this.cache.set(accountId, cached);
    console.log('📦 Folder cache SET:', accountId, `(${folders.length} folders)`);
  }

  /**
   * Invalidate cache for account
   */
  invalidate(accountId: string): void {
    this.cache.delete(accountId);
    console.log('📦 Folder cache INVALIDATED:', accountId);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.cache.clear();
    console.log('📦 Folder cache CLEARED');
  }

  /**
   * Background refresh (non-blocking)
   */
  private async refreshInBackground(accountId: string): Promise<void> {
    if (this.refreshing.has(accountId)) {
      return; // Already refreshing
    }

    this.refreshing.add(accountId);

    try {
      // ✅ FIX: Add timeout to prevent hanging requests
      const fetchWithTimeout = (url: string, timeout = 10000) => {
        return Promise.race([
          fetch(url),
          new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          ),
        ]);
      };

      // Fetch fresh data with timeout
      const [foldersRes, countsRes] = await Promise.all([
        fetchWithTimeout(`/api/nylas/folders/sync?accountId=${accountId}`),
        fetchWithTimeout(`/api/nylas/folders/counts?accountId=${accountId}`),
      ]);

      if (foldersRes.ok && countsRes.ok) {
        const foldersData = await foldersRes.json();
        const countsData = await countsRes.json();

        if (foldersData.success && countsData.success) {
          // Convert counts array to map
          const countsMap: Record<string, any> = {};
          countsData.counts.forEach((count: any) => {
            countsMap[count.folder.toLowerCase()] = {
              totalCount: count.totalCount,
              unreadCount: count.unreadCount,
            };
          });

          // Update cache
          this.setFolders(accountId, foldersData.folders, countsMap);
          console.log('✅ Background refresh complete:', accountId);

          // Notify listeners
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('folderCacheRefreshed', {
              detail: { accountId }
            }));
          }
        }
      }
    } catch (error) {
      console.error('❌ Background refresh failed:', error);
      // ✅ FIX: Don't invalidate cache on error - keep stale data
    } finally {
      this.refreshing.delete(accountId);
    }
  }

  /**
   * Prefetch folders for account (before user navigates)
   */
  async prefetch(accountId: string): Promise<void> {
    const cached = await this.getFolders(accountId);
    if (cached) {
      console.log('📦 Prefetch: Already cached', accountId);
      return;
    }

    console.log('📦 Prefetching folders:', accountId);
    await this.refreshInBackground(accountId);
  }

  /**
   * Get cache stats
   */
  getStats(): {
    size: number;
    accounts: string[];
    oldest: number | null;
    newest: number | null;
  } {
    const accounts = Array.from(this.cache.keys());
    const timestamps = Array.from(this.cache.values()).map(c => c.timestamp);

    return {
      size: this.cache.size,
      accounts,
      oldest: timestamps.length > 0 ? Math.min(...timestamps) : null,
      newest: timestamps.length > 0 ? Math.max(...timestamps) : null,
    };
  }
}

// Singleton instance
export const folderCache = new FolderCacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  backgroundRefresh: true,
});

// Export for testing
export { FolderCacheManager };

