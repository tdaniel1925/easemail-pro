/**
 * React hook for JMAP EventSource real-time updates
 * Automatically syncs new emails when they arrive
 */

import { useEffect, useRef, useState } from 'react';
import { createJMAPEventSource, JMAPEventSource } from '@/lib/jmap/eventSource';

interface UseJMAPEventSourceOptions {
  apiToken?: string;
  accountId?: string;
  enabled?: boolean;
  onNewEmails?: () => void;
  onError?: (error: Error) => void;
}

export function useJMAPEventSource(options: UseJMAPEventSourceOptions = {}) {
  const {
    apiToken,
    accountId,
    enabled = true,
    onNewEmails,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const eventSourceRef = useRef<JMAPEventSource | null>(null);
  const syncInProgress = useRef(false);

  useEffect(() => {
    // Only connect if we have credentials and it's enabled
    if (!enabled || !apiToken || !accountId) {
      return;
    }

    console.log('[EventSource Hook] Initializing for account:', accountId);

    // Create EventSource
    const eventSource = createJMAPEventSource({
      apiToken,
      accountId,
      onStateChange: async (change) => {
        console.log('[EventSource Hook] 📧 State change detected:', change.type);

        // Prevent concurrent syncs
        if (syncInProgress.current) {
          console.log('[EventSource Hook] Sync already in progress, skipping...');
          return;
        }

        try {
          syncInProgress.current = true;

          // Trigger sync for this specific account
          console.log('[EventSource Hook] Triggering sync...');
          const response = await fetch('/api/jmap/auto-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`[EventSource Hook] ✅ Synced ${data.newEmailsFound} new emails`);
            setLastSync(new Date());
            onNewEmails?.();
          }
        } catch (error) {
          console.error('[EventSource Hook] Sync error:', error);
        } finally {
          syncInProgress.current = false;
        }
      },
      onError: (error) => {
        console.error('[EventSource Hook] Error:', error);
        setIsConnected(false);
        onError?.(error);
      },
      onConnected: () => {
        console.log('[EventSource Hook] ✅ Connected to real-time updates');
        setIsConnected(true);
      },
      onDisconnected: () => {
        console.log('[EventSource Hook] Disconnected from real-time updates');
        setIsConnected(false);
      },
    });

    eventSourceRef.current = eventSource;

    // Connect
    eventSource.connect().catch((error) => {
      console.error('[EventSource Hook] Failed to connect:', error);
      onError?.(error);
    });

    // Cleanup on unmount
    return () => {
      console.log('[EventSource Hook] Cleaning up...');
      eventSource.disconnect();
      eventSourceRef.current = null;
    };
  }, [apiToken, accountId, enabled, onNewEmails, onError]);

  return {
    isConnected,
    lastSync,
  };
}
