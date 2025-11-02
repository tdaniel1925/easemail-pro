/**
 * Prefetching Hook
 * 
 * Prefetches data on hover for instant navigation
 * Like Superhuman: Feels instant because data is already loaded
 */

import { useCallback, useRef } from 'react';
import { folderCache } from '@/lib/cache/folder-cache';

interface PrefetchOptions {
  delay?: number; // Delay before prefetching (ms)
  enabled?: boolean; // Enable/disable prefetching
}

export function usePrefetch(options: PrefetchOptions = {}) {
  const { delay = 200, enabled = true } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());

  /**
   * Prefetch folders on hover
   */
  const prefetchFolders = useCallback((accountId: string) => {
    if (!enabled || !accountId) return;
    
    // Already prefetched
    if (prefetchedRef.current.has(accountId)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce: Only prefetch if user hovers for delay ms
    timeoutRef.current = setTimeout(() => {
      console.log('🚀 Prefetching account:', accountId);
      
      folderCache.prefetch(accountId)
        .then(() => {
          prefetchedRef.current.add(accountId);
          console.log('✅ Prefetch complete:', accountId);
        })
        .catch(error => {
          console.error('❌ Prefetch failed:', error);
        });
    }, delay);
  }, [enabled, delay]);

  /**
   * Prefetch emails for folder
   */
  const prefetchEmails = useCallback((accountId: string, folder: string) => {
    if (!enabled || !accountId || !folder) return;

    const cacheKey = `${accountId}:${folder}`;
    
    // Already prefetched
    if (prefetchedRef.current.has(cacheKey)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce
    timeoutRef.current = setTimeout(() => {
      console.log('🚀 Prefetching emails:', cacheKey);
      
      // Prefetch emails
      fetch(`/api/nylas/messages?accountId=${accountId}&folder=${folder}&limit=50`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            prefetchedRef.current.add(cacheKey);
            console.log('✅ Prefetch complete:', cacheKey, `(${data.messages?.length || 0} emails)`);
          }
        })
        .catch(error => {
          console.error('❌ Prefetch failed:', error);
        });
    }, delay);
  }, [enabled, delay]);

  /**
   * Cancel prefetch (on mouse leave)
   */
  const cancelPrefetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Clear prefetch history (force re-prefetch)
   */
  const clearPrefetchHistory = useCallback(() => {
    prefetchedRef.current.clear();
  }, []);

  return {
    prefetchFolders,
    prefetchEmails,
    cancelPrefetch,
    clearPrefetchHistory,
  };
}

/**
 * Prefetch on Link Hover
 * 
 * HOC to add prefetching to navigation links
 */
export function withPrefetch<P extends object>(
  Component: React.ComponentType<P>,
  prefetchFn: () => void | Promise<void>
) {
  return function PrefetchedComponent(props: P) {
    const handleMouseEnter = () => {
      prefetchFn();
    };

    return (
      <div onMouseEnter={handleMouseEnter}>
        <Component {...props} />
      </div>
    );
  };
}

