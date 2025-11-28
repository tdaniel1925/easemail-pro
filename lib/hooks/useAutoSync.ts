/**
 * Auto-sync hook for JMAP accounts
 * Automatically syncs new emails every 5 minutes
 */

import { useEffect, useRef } from 'react';

interface AutoSyncOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onSync?: () => void;
  onError?: (error: Error) => void;
}

export function useAutoSync(options: AutoSyncOptions = {}) {
  const {
    enabled = true,
    interval = 5 * 60 * 1000, // 5 minutes default
    onSync,
    onError,
  } = options;

  const syncInProgress = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const performSync = async () => {
      // Prevent concurrent syncs
      if (syncInProgress.current) {
        console.log('[Auto-sync] Sync already in progress, skipping...');
        return;
      }

      try {
        syncInProgress.current = true;
        console.log('[Auto-sync] Starting automatic sync...');

        const response = await fetch('/api/jmap/auto-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (response.ok) {
          console.log(`[Auto-sync] ✅ Synced ${data.newEmailsFound} new emails from ${data.accountsSynced} accounts`);
          onSync?.();
        } else {
          throw new Error(data.error || 'Auto-sync failed');
        }
      } catch (error) {
        console.error('[Auto-sync] ❌ Error:', error);
        onError?.(error as Error);
      } finally {
        syncInProgress.current = false;
      }
    };

    // Run initial sync after 5 seconds
    const initialTimeout = setTimeout(() => {
      performSync();
    }, 5000);

    // Then run periodically
    const intervalId = setInterval(() => {
      performSync();
    }, interval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [enabled, interval, onSync, onError]);

  // Return manual sync function
  const manualSync = async () => {
    if (syncInProgress.current) {
      console.log('[Auto-sync] Sync already in progress');
      return;
    }

    try {
      syncInProgress.current = true;
      console.log('[Auto-sync] Manual sync triggered...');

      const response = await fetch('/api/jmap/auto-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`[Auto-sync] ✅ Synced ${data.newEmailsFound} new emails from ${data.accountsSynced} accounts`);
        onSync?.();
        return data;
      } else {
        throw new Error(data.error || 'Manual sync failed');
      }
    } catch (error) {
      console.error('[Auto-sync] ❌ Error:', error);
      onError?.(error as Error);
      throw error;
    } finally {
      syncInProgress.current = false;
    }
  };

  return {
    manualSync,
    isSyncing: syncInProgress.current,
  };
}
