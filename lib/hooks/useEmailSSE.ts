/**
 * React Hook for Real-time Email Updates via Server-Sent Events
 *
 * Provides Gmail/Outlook-like instant email updates without polling.
 * Automatically reconnects on disconnection and handles errors gracefully.
 *
 * Usage:
 *   const { isConnected, lastEvent, error } = useEmailSSE(accountId, {
 *     onNewEmail: (event) => { refetchEmails(); showNotification(event); },
 *     onEmailUpdated: (event) => { updateEmailInCache(event); },
 *     onEmailDeleted: (event) => { removeEmailFromCache(event); },
 *   });
 */

import { useEffect, useRef, useState, useCallback } from 'react';

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

export interface UseEmailSSEOptions {
  /** Called when a new email arrives */
  onNewEmail?: (event: EmailSyncEvent) => void;

  /** Called when an email is updated (read/starred/moved) */
  onEmailUpdated?: (event: EmailSyncEvent) => void;

  /** Called when an email is deleted */
  onEmailDeleted?: (event: EmailSyncEvent) => void;

  /** Called when a folder is updated */
  onFolderUpdated?: (event: EmailSyncEvent) => void;

  /** Called when sync starts/completes/progresses */
  onSyncStatus?: (event: EmailSyncEvent) => void;

  /** Called when connection is established */
  onConnect?: () => void;

  /** Called when connection is lost */
  onDisconnect?: () => void;

  /** Called on any error */
  onError?: (error: Error) => void;

  /** Whether to automatically reconnect on disconnection (default: true) */
  autoReconnect?: boolean;

  /** Reconnection delay in ms (default: 3000) */
  reconnectDelay?: number;

  /** Maximum reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;

  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

export interface UseEmailSSEReturn {
  /** Whether SSE connection is active */
  isConnected: boolean;

  /** Whether currently attempting to reconnect */
  isReconnecting: boolean;

  /** Last event received */
  lastEvent: EmailSyncEvent | null;

  /** Current error if any */
  error: Error | null;

  /** Number of reconnection attempts */
  reconnectAttempts: number;

  /** Manually disconnect */
  disconnect: () => void;

  /** Manually reconnect */
  reconnect: () => void;
}

export function useEmailSSE(
  accountId: string | null | undefined,
  options: UseEmailSSEOptions = {}
): UseEmailSSEReturn {
  const {
    onNewEmail,
    onEmailUpdated,
    onEmailDeleted,
    onFolderUpdated,
    onSyncStatus,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectDelay = 3000,
    maxReconnectAttempts = 10,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<EmailSyncEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);
  }, [cleanup]);

  // Connect function
  const connect = useCallback(() => {
    if (!accountId || !enabled || typeof window === 'undefined') {
      return;
    }

    // Clean up existing connection
    cleanup();

    try {
      const eventSource = new EventSource(`/api/sse/emails?accountId=${accountId}`);
      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.addEventListener('connected', () => {
        if (!mountedRef.current) return;

        setIsConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        setError(null);

        console.log(`🔌 SSE connected for account ${accountId}`);
        onConnect?.();
      });

      // Handle timeout (server closes connection after 4.5 minutes)
      eventSource.addEventListener('timeout', () => {
        if (!mountedRef.current) return;

        console.log('⏰ SSE timeout - reconnecting...');
        setIsConnected(false);

        // Reconnect immediately on timeout (not an error)
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, 500); // Quick reconnect on timeout
        }
      });

      // Handle new emails
      eventSource.addEventListener('message.created', (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data) as EmailSyncEvent;
          setLastEvent(data);
          onNewEmail?.(data);
        } catch (err) {
          console.error('Failed to parse message.created event:', err);
        }
      });

      // Handle email updates
      eventSource.addEventListener('message.updated', (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data) as EmailSyncEvent;
          setLastEvent(data);
          onEmailUpdated?.(data);
        } catch (err) {
          console.error('Failed to parse message.updated event:', err);
        }
      });

      // Handle email deletions
      eventSource.addEventListener('message.deleted', (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data) as EmailSyncEvent;
          setLastEvent(data);
          onEmailDeleted?.(data);
        } catch (err) {
          console.error('Failed to parse message.deleted event:', err);
        }
      });

      // Handle folder updates
      eventSource.addEventListener('folder.updated', (event) => {
        if (!mountedRef.current) return;

        try {
          const data = JSON.parse(event.data) as EmailSyncEvent;
          setLastEvent(data);
          onFolderUpdated?.(data);
        } catch (err) {
          console.error('Failed to parse folder.updated event:', err);
        }
      });

      // Handle sync status events
      ['sync.started', 'sync.completed', 'sync.progress'].forEach((eventType) => {
        eventSource.addEventListener(eventType, (event) => {
          if (!mountedRef.current) return;

          try {
            const data = JSON.parse(event.data) as EmailSyncEvent;
            setLastEvent(data);
            onSyncStatus?.(data);
          } catch (err) {
            console.error(`Failed to parse ${eventType} event:`, err);
          }
        });
      });

      // Handle errors
      eventSource.onerror = (event) => {
        if (!mountedRef.current) return;

        console.error('SSE error:', event);
        setIsConnected(false);

        const err = new Error('SSE connection error');
        setError(err);
        onError?.(err);
        onDisconnect?.();

        // Attempt reconnection
        if (autoReconnect && reconnectAttempts < maxReconnectAttempts) {
          setIsReconnecting(true);

          const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts); // Exponential backoff
          console.log(`🔄 SSE reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setReconnectAttempts((prev) => prev + 1);
              connect();
            }
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.error('❌ SSE max reconnection attempts reached');
          setIsReconnecting(false);
        }
      };
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError(err instanceof Error ? err : new Error('Failed to create SSE connection'));
      onError?.(err instanceof Error ? err : new Error('Failed to create SSE connection'));
    }
  }, [
    accountId,
    enabled,
    autoReconnect,
    reconnectDelay,
    maxReconnectAttempts,
    reconnectAttempts,
    onNewEmail,
    onEmailUpdated,
    onEmailDeleted,
    onFolderUpdated,
    onSyncStatus,
    onConnect,
    onDisconnect,
    onError,
    cleanup,
  ]);

  // Reconnect function (exposed to consumer)
  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    connect();
  }, [connect]);

  // Set up connection on mount / account change
  useEffect(() => {
    mountedRef.current = true;

    if (accountId && enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [accountId, enabled, connect, cleanup]);

  return {
    isConnected,
    isReconnecting,
    lastEvent,
    error,
    reconnectAttempts,
    disconnect,
    reconnect,
  };
}

export default useEmailSSE;
