/**
 * Email List v3
 * Infinite scroll email list with proper cursor-based pagination
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Mail as MailIcon, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface EmailListV3Props {
  accountId: string;
  folderId: string | null;
  folderName: string;
  onMessageSelect?: (messageId: string) => void;
}

interface EmailMessage {
  id: string;
  subject: string;
  from: Array<{ email: string; name?: string }>;
  snippet: string;
  date: number;
  unread: boolean;
  starred: boolean;
}

export function EmailListV3({ accountId, folderId, folderName, onMessageSelect }: EmailListV3Props) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset and load messages when folder changes
  useEffect(() => {
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setInitialLoading(true);
    loadMessages(true);
  }, [accountId, folderId]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMessages(false);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, nextCursor]);

  const loadMessages = async (reset: boolean = false) => {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        accountId,
        limit: '50',
      });

      if (folderId) {
        params.append('folderId', folderId);
      }

      if (!reset && nextCursor) {
        params.append('cursor', nextCursor);
      }

      const response = await fetch(`/api/nylas-v3/messages?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();

      if (reset) {
        setMessages(data.messages || []);
      } else {
        setMessages((prev) => [...prev, ...(data.messages || [])]);
      }

      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleRefresh = () => {
    setMessages([]);
    setNextCursor(null);
    loadMessages(true);
  };

  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold capitalize">{folderName}</h2>
          <p className="text-sm text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
            {hasMore && ' (loading more...)'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Email List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MailIcon className="h-16 w-16 mb-4 opacity-20" />
            <p>No messages in this folder</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {messages.map((message) => (
                <EmailPreview
                  key={message.id}
                  message={message}
                  onClick={() => onMessageSelect?.(message.id)}
                />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="py-4 text-center">
              {loading && (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
              )}
              {!hasMore && messages.length > 0 && (
                <p className="text-sm text-muted-foreground">No more messages</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EmailPreview({ message, onClick }: { message: EmailMessage; onClick?: () => void }) {
  const from = message.from[0];
  const date = new Date(message.date * 1000);

  return (
    <div
      className={cn(
        'p-4 hover:bg-accent cursor-pointer transition-colors',
        message.unread && 'bg-accent/50'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className={cn(
                'font-medium truncate',
                message.unread && 'font-semibold'
              )}
            >
              {from.name || from.email}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(date, { addSuffix: true })}
            </span>
          </div>

          <div
            className={cn(
              'text-sm mb-1',
              message.unread ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {message.subject || '(no subject)'}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {message.snippet}
          </p>
        </div>

        {message.starred && (
          <div className="text-yellow-500 flex-shrink-0">★</div>
        )}
      </div>
    </div>
  );
}
