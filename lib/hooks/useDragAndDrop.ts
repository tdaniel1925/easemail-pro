/**
 * useDragAndDrop Hook
 * 
 * Enables drag-and-drop email moving like Outlook
 */

import { useState, useCallback } from 'react';

export interface DragData {
  emailId: string;
  emailSubject: string;
  fromFolder: string;
}

export function useDragAndDrop() {
  const [draggedEmail, setDraggedEmail] = useState<DragData | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const handleDragStart = useCallback((emailId: string, emailSubject: string, fromFolder: string) => {
    setDraggedEmail({ emailId, emailSubject, fromFolder });
    console.log('🎯 Started dragging:', emailSubject);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEmail(null);
    setDropTarget(null);
    console.log('🎯 Stopped dragging');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault(); // Allow drop
    setDropTarget(folderId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTarget(null);
  }, []);

  const handleDrop = useCallback(async (
    e: React.DragEvent,
    toFolder: string,
    onSuccess?: () => void,
    onError?: (error: Error) => void
  ) => {
    e.preventDefault();
    
    if (!draggedEmail) {
      console.warn('⚠️ No email being dragged');
      return;
    }

    console.log(`📧 Moving email "${draggedEmail.emailSubject}" to folder "${toFolder}"`);

    try {
      // Call API to move email
      const response = await fetch('/api/nylas/messages/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: draggedEmail.emailId,
          action: 'move',
          folder: toFolder,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to move email');
      }

      console.log('✅ Email moved successfully');
      onSuccess?.();

      // Notify to refresh counts
      window.dispatchEvent(new CustomEvent('emailActionComplete', {
        detail: { emailId: draggedEmail.emailId, action: 'move' }
      }));
    } catch (error) {
      console.error('❌ Failed to move email:', error);
      onError?.(error as Error);
    } finally {
      setDraggedEmail(null);
      setDropTarget(null);
    }
  }, [draggedEmail]);

  return {
    draggedEmail,
    dropTarget,
    isDragging: !!draggedEmail,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}

