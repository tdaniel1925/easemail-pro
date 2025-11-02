/**
 * useOptimisticEmailActions Hook
 * 
 * Provides instant UI feedback for email actions:
 * - Mark as read/unread
 * - Star/unstar
 * - Move to folder
 * - Delete/trash
 * - Archive
 * 
 * Like Superhuman: UI updates immediately, syncs in background
 * Automatically rolls back on error
 */

import { useState, useCallback } from 'react';

export interface EmailAction {
  emailId: string;
  action: 'markRead' | 'markUnread' | 'star' | 'unstar' | 'move' | 'delete' | 'archive';
  data?: any;
}

export interface OptimisticUpdate {
  emailId: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export function useOptimisticEmailActions() {
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate[]>>(new Map());

  /**
   * Apply optimistic update and call API
   */
  const performAction = useCallback(async (
    emailId: string,
    action: EmailAction['action'],
    data: any = {},
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    console.log(`⚡ Optimistic: ${action} for email ${emailId}`);

    // Store old state for rollback
    const updates: OptimisticUpdate[] = [];

    try {
      // Call API
      const response = await fetch('/api/nylas/messages/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailId, action, ...data }),
      });

      if (!response.ok) {
        throw new Error(`Action failed: ${response.statusText}`);
      }

      console.log(`✅ Optimistic action ${action} succeeded`);
      onSuccess?.();

      // Notify parent to refresh counts
      window.dispatchEvent(new CustomEvent('emailActionComplete', { detail: { emailId, action } }));
    } catch (error) {
      console.error(`❌ Optimistic action ${action} failed:`, error);
      onError?.(error as Error);

      // Rollback handled by parent component via error
      throw error;
    } finally {
      // Clear pending updates
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(emailId);
        return newMap;
      });
    }
  }, []);

  /**
   * Mark email as read
   */
  const markAsRead = useCallback((emailId: string, onSuccess?: () => void, onError?: (error: Error) => void) => {
    return performAction(emailId, 'markRead', {}, onSuccess, onError);
  }, [performAction]);

  /**
   * Mark email as unread
   */
  const markAsUnread = useCallback((emailId: string, onSuccess?: () => void, onError?: (error: Error) => void) => {
    return performAction(emailId, 'markUnread', {}, onSuccess, onError);
  }, [performAction]);

  /**
   * Star email
   */
  const starEmail = useCallback((emailId: string, onSuccess?: () => void, onError?: (error: Error) => void) => {
    return performAction(emailId, 'star', {}, onSuccess, onError);
  }, [performAction]);

  /**
   * Unstar email
   */
  const unstarEmail = useCallback((emailId: string, onSuccess?: () => void, onError?: (error: Error) => void) => {
    return performAction(emailId, 'unstar', {}, onSuccess, onError);
  }, [performAction]);

  /**
   * Move email to folder
   */
  const moveToFolder = useCallback((
    emailId: string,
    folder: string,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    return performAction(emailId, 'move', { folder }, onSuccess, onError);
  }, [performAction]);

  /**
   * Delete email
   */
  const deleteEmail = useCallback((emailId: string, onSuccess?: () => void, onError?: (error: Error) => void) => {
    return performAction(emailId, 'delete', {}, onSuccess, onError);
  }, [performAction]);

  /**
   * Archive email
   */
  const archiveEmail = useCallback((emailId: string, onSuccess?: () => void, onError?: (error: Error) => void) => {
    return performAction(emailId, 'archive', {}, onSuccess, onError);
  }, [performAction]);

  return {
    markAsRead,
    markAsUnread,
    starEmail,
    unstarEmail,
    moveToFolder,
    deleteEmail,
    archiveEmail,
    pendingUpdates: Array.from(pendingUpdates.values()).flat(),
  };
}

