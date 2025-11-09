/**
 * Email List Enhanced v3
 * Complete email list with dropdowns, AI summaries, bulk actions, and all v1 features
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  Loader2,
  Mail as MailIcon,
  RefreshCw,
  Star,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  Download,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Trash2,
  Archive,
  MailOpen,
  Mail,
  FolderInput,
  CheckSquare,
  Square,
  MessageSquare,
  Tag,
  Clock,
  Ban,
  Bell,
} from 'lucide-react';
import { cn, formatDate, getInitials, generateAvatarColor, formatFileSize } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useEmailSummary } from '@/lib/hooks/useEmailSummary';
import { ThreadSummaryPanelV3 } from './thread-summary-panel-v3';
import SMSNotificationBell from '@/components/sms/SMSNotificationBell';

interface EmailMessage {
  id: string;
  subject: string;
  from: Array<{ email: string; name?: string }>;
  snippet: string;
  date: number;
  unread: boolean;
  starred: boolean;
  hasAttachments?: boolean;
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    content_type: string;
  }>;
  labels?: string[];
  threadId?: string | null;
  body?: string;
}

interface EmailListEnhancedV3Props {
  accountId: string;
  folderId: string | null;
  folderName: string;
  onMessageSelect?: (messageId: string) => void;
  onEmailSelect?: (email: EmailMessage) => void;
  onCompose?: (type: 'reply' | 'reply-all' | 'forward', email: EmailMessage) => void;
}

export function EmailListEnhancedV3({
  accountId,
  folderId,
  folderName,
  onMessageSelect,
  onEmailSelect,
  onCompose,
}: EmailListEnhancedV3Props) {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // UI state
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [showAISummaries, setShowAISummaries] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locallyRemovedEmails, setLocallyRemovedEmails] = useState<Set<string>>(new Set());
  const [smsUnreadCount, setSmsUnreadCount] = useState(0);
  const [undoStack, setUndoStack] = useState<{
    action: string;
    emailIds: string[];
    timestamp: number;
  } | null>(null);

  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  // Safe HTML sanitization (client-side only)
  const sanitizeHTML = (html: string) => {
    if (typeof window === 'undefined') return html; // Skip on server

    // Dynamically import DOMPurify only on client
    const DOMPurify = require('isomorphic-dompurify');
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'a', 'img', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'hr',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target'],
    });
  };

  // Filter messages: remove locally deleted + apply search
  const visibleMessages = messages
    .filter((message) => !locallyRemovedEmails.has(message.id))
    .filter((message) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();
      const subject = message.subject?.toLowerCase() || '';
      const fromName = message.from?.[0]?.name?.toLowerCase() || '';
      const fromEmail = message.from?.[0]?.email?.toLowerCase() || '';
      const snippet = message.snippet?.toLowerCase() || '';

      return (
        subject.includes(query) ||
        fromName.includes(query) ||
        fromEmail.includes(query) ||
        snippet.includes(query)
      );
    });

  // Reset and load messages when folder changes
  useEffect(() => {
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    setInitialLoading(true);
    setExpandedEmailId(null);
    setSelectedEmailId(null);
    loadMessages(true);
  }, [accountId, folderId]);

  // Subscribe to real-time email sync events
  useEffect(() => {
    if (!accountId) return;

    const { subscribeToEmailSync } = require('@/lib/realtime/email-sync');

    const unsubscribe = subscribeToEmailSync(accountId, (event: any) => {
      console.log('[EmailList] Real-time event:', event.type);

      // Refresh the current folder when messages change
      if (event.type === 'message.created' || event.type === 'message.deleted') {
        // Reload messages to show new/removed messages
        loadMessages(true);
      }

      if (event.type === 'message.updated') {
        // Optionally refresh to show updated message status
        // For now, we rely on optimistic updates from UI actions
      }
    });

    return () => {
      unsubscribe();
    };
  }, [accountId]);

  // Fetch SMS unread count on mount and periodically
  useEffect(() => {
    const fetchSMSCount = async () => {
      try {
        const response = await fetch('/api/sms/inbox');
        if (response.ok) {
          const data = await response.json();
          const unreadCount = data.messages?.filter((msg: any) => !msg.isRead).length || 0;
          setSmsUnreadCount(unreadCount);
        }
      } catch (error) {
        console.error('Failed to fetch SMS count:', error);
      }
    };

    fetchSMSCount();
    const interval = setInterval(fetchSMSCount, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

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

  // Auto-clear undo stack after 5 seconds
  useEffect(() => {
    if (!undoStack) return;

    const timeElapsed = Date.now() - undoStack.timestamp;
    const timeRemaining = 5000 - timeElapsed;

    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setUndoStack(null);
      }, timeRemaining);

      return () => clearTimeout(timer);
    } else {
      setUndoStack(null);
    }
  }, [undoStack]);

  // Load AI Summary preference
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const response = await fetch('/api/user/preferences');
        const data = await response.json();
        if (data.success && data.preferences) {
          setShowAISummaries(data.preferences.showAISummaries ?? true);
        }
      } catch (error) {
        console.error('Failed to load AI summary preference:', error);
      }
    };
    loadPreference();
  }, []);

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
    setLocallyRemovedEmails(new Set());
    loadMessages(true);
  };

  const handleAISummaryToggle = async (checked: boolean) => {
    setShowAISummaries(checked);

    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showAISummaries: checked }),
      });
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmails.size === visibleMessages.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(visibleMessages.map((e) => e.id)));
    }
  };

  const handleSelectEmail = (emailId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
    if (newSelected.size === 0) {
      setSelectMode(false);
    } else {
      setSelectMode(true);
    }
  };

  const handleBulkAction = async (action: string) => {
    const selectedIds = Array.from(selectedEmails);

    if (selectedIds.length === 0) {
      return;
    }

    // Optimistic update for delete/archive
    if (action === 'delete' || action === 'archive') {
      setLocallyRemovedEmails((prev) => {
        const next = new Set(prev);
        selectedIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedEmails(new Set());
      setSelectMode(false);

      // Set undo stack
      setUndoStack({
        action,
        emailIds: selectedIds,
        timestamp: Date.now(),
      });
    }

    try {
      const response = await fetch('/api/nylas-v3/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          messageIds: selectedIds,
          action,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error(`Failed to ${action} emails`);
        // Revert optimistic update on failure
        if (action === 'delete' || action === 'archive') {
          setLocallyRemovedEmails((prev) => {
            const next = new Set(prev);
            selectedIds.forEach((id) => next.delete(id));
            return next;
          });
        }
      } else {
        if (action !== 'delete' && action !== 'archive') {
          handleRefresh();
        }
      }
    } catch (error) {
      console.error(`${action} error:`, error);
      // Revert optimistic update on error
      if (action === 'delete' || action === 'archive') {
        setLocallyRemovedEmails((prev) => {
          const next = new Set(prev);
          selectedIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    }
  };

  const handleUndo = () => {
    if (!undoStack) return;

    // Restore emails from locallyRemovedEmails
    setLocallyRemovedEmails((prev) => {
      const next = new Set(prev);
      undoStack.emailIds.forEach((id) => next.delete(id));
      return next;
    });

    // Clear undo stack
    setUndoStack(null);
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
      <div className="flex-shrink-0 h-14 px-4 border-b border-border flex items-center">
        {selectMode ? (
          /* Bulk Action Toolbar */
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={handleSelectAll}
              className={cn(
                'h-5 w-5 rounded border-2 flex items-center justify-center transition-all',
                selectedEmails.size === visibleMessages.length
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border hover:border-primary/50 bg-background'
              )}
            >
              {selectedEmails.size === visibleMessages.length && <CheckSquare className="h-4 w-4" />}
            </button>

            <span className="text-sm font-medium">{selectedEmails.size} selected</span>

            <div className="flex gap-1 overflow-x-auto">
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction('delete')} className="h-8">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction('archive')} className="h-8">
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction('markRead')} className="h-8">
                <MailOpen className="h-4 w-4 mr-2" />
                Read
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction('markUnread')} className="h-8">
                <Mail className="h-4 w-4 mr-2" />
                Unread
              </Button>
            </div>

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedEmails(new Set());
                setSelectMode(false);
              }}
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        ) : (
          /* Normal Toolbar */
          <div className="flex items-center gap-4 w-full">
            <div className="flex-shrink-0">
              <h2 className="text-sm font-medium capitalize">{folderName}</h2>
            </div>

            {/* AI Summary Toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Switch checked={showAISummaries} onCheckedChange={handleAISummaryToggle} />
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">AI</span>
              </label>
            </div>

            {/* Search bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search emails..."
                className="w-full pl-10 pr-3 h-9 bg-background border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* SMS Notification Bell */}
            <SMSNotificationBell
              unreadCount={smsUnreadCount}
              onCountUpdate={(count) => setSmsUnreadCount(count)}
            />

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
              title="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
          </div>
        )}
      </div>

      {/* Email List - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MailIcon className="h-16 w-16 mb-4 opacity-20" />
            <p>No messages in this folder</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visibleMessages.map((message) => (
                <EmailCard
                  key={message.id}
                  message={message}
                  accountId={accountId}
                  isExpanded={expandedEmailId === message.id}
                  isSelected={selectedEmailId === message.id}
                  isChecked={selectedEmails.has(message.id)}
                  selectMode={selectMode}
                  showAISummaries={showAISummaries}
                  onSelect={(e) => handleSelectEmail(message.id, e)}
                  onClick={() => {
                    setExpandedEmailId(expandedEmailId === message.id ? null : message.id);
                    setSelectedEmailId(message.id);
                    onEmailSelect?.(message); // Notify parent about selected email
                  }}
                  onCompose={onCompose}
                  onRemove={(emailId, action) => {
                    setLocallyRemovedEmails((prev) => {
                      const next = new Set(prev);
                      next.add(emailId);
                      return next;
                    });
                    setUndoStack({
                      action,
                      emailIds: [emailId],
                      timestamp: Date.now(),
                    });
                  }}
                />
              ))}
            </div>

            {/* Infinite scroll trigger */}
            <div ref={observerTarget} className="py-4 text-center">
              {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />}
              {!hasMore && messages.length > 0 && (
                <p className="text-sm text-muted-foreground">No more messages</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Undo Bar */}
      {undoStack && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-sm font-medium">
              {undoStack.emailIds.length} email{undoStack.emailIds.length > 1 ? 's' : ''}{' '}
              {undoStack.action === 'delete' ? 'deleted' : 'archived'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              className="bg-background/10 hover:bg-background/20 text-background h-8"
            >
              Undo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EmailCardProps {
  message: EmailMessage;
  accountId: string;
  isExpanded: boolean;
  isSelected: boolean;
  isChecked: boolean;
  selectMode: boolean;
  showAISummaries: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  onCompose?: (type: 'reply' | 'reply-all' | 'forward', email: EmailMessage) => void;
  onRemove: (emailId: string, action: 'delete' | 'archive') => void;
}

function EmailCard({
  message,
  accountId,
  isExpanded,
  isSelected,
  isChecked,
  selectMode,
  showAISummaries,
  onSelect,
  onClick,
  onCompose,
  onRemove,
}: EmailCardProps) {
  const sender = message.from[0];
  const avatarColor = generateAvatarColor(sender.email);
  const [fullEmail, setFullEmail] = useState<EmailMessage | null>(null);
  const [loadingFullEmail, setLoadingFullEmail] = useState(false);
  const [showThread, setShowThread] = useState(false);

  // Viewport detection for AI summary
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true,
  });

  // Convert to format expected by useEmailSummary hook
  const emailForSummary = {
    id: message.id,
    fromEmail: sender.email,
    fromName: sender.name,
    subject: message.subject,
    snippet: message.snippet,
    receivedAt: new Date(message.date * 1000),
    isRead: !message.unread,
    isStarred: message.starred,
    hasAttachments: message.hasAttachments || false,
    attachments: message.attachments || [],
    labels: message.labels || [],
    threadId: message.threadId,
  };

  const shouldFetchSummary = inView && showAISummaries;
  const { data: summaryData, isLoading: isSummaryLoading } = useEmailSummary(
    emailForSummary,
    shouldFetchSummary
  );

  // Fetch full email body when expanded
  useEffect(() => {
    if (isExpanded && !fullEmail && !message.body) {
      const fetchFullEmail = async () => {
        setLoadingFullEmail(true);
        try {
          const response = await fetch(`/api/nylas-v3/messages/${message.id}?accountId=${accountId}`);
          const data = await response.json();
          if (data.success && data.message) {
            setFullEmail(data.message);
          }
        } catch (error) {
          console.error('Failed to fetch full email:', error);
        } finally {
          setLoadingFullEmail(false);
        }
      };
      fetchFullEmail();
    }
  }, [isExpanded, message.id, message.body, fullEmail, accountId]);

  const displayEmail = fullEmail || message;
  const displayText = (showAISummaries && summaryData?.summary) || message.snippet;
  const hasAISummary = showAISummaries && !!(summaryData && summaryData.summary);

  const handleAction = async (e: React.MouseEvent, action: string) => {
    e.stopPropagation();

    if (action === 'reply' || action === 'reply-all' || action === 'forward') {
      onCompose?.(action as 'reply' | 'reply-all' | 'forward', message);
      return;
    }

    if (action === 'archive' || action === 'delete') {
      onRemove(message.id, action as 'delete' | 'archive');

      try {
        await fetch('/api/nylas-v3/messages/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            messageIds: [message.id],
            action,
          }),
        });
      } catch (error) {
        console.error(`${action} error:`, error);
      }
      return;
    }

    // Handle star/unstar and mark read/unread
    if (action === 'star' || action === 'unstar' || action === 'markRead' || action === 'markUnread') {
      try {
        await fetch('/api/nylas-v3/messages/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            messageIds: [message.id],
            action,
          }),
        });

        // Optimistically update local state
        if (action === 'star') {
          message.starred = true;
        } else if (action === 'unstar') {
          message.starred = false;
        } else if (action === 'markRead') {
          message.unread = false;
        } else if (action === 'markUnread') {
          message.unread = true;
        }
      } catch (error) {
        console.error(`${action} error:`, error);
      }
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        'border border-border/50 rounded-lg transition-all bg-card overflow-hidden cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5',
        !message.unread && 'bg-card',
        message.unread && 'bg-accent/30',
        isSelected && 'ring-2 ring-primary ring-offset-1'
      )}
    >
      {/* Email Preview - Always Visible */}
      <div
        className={cn('p-4 transition-colors', isExpanded && 'bg-accent/50')}
        onClick={onClick}
      >
        <div className="flex gap-3">
          {/* Checkbox */}
          <div
            className="flex items-start pt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(e);
            }}
          >
            <button
              className={cn(
                'h-5 w-5 rounded border-2 flex items-center justify-center transition-all',
                isChecked
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border hover:border-primary/50 bg-background'
              )}
            >
              {isChecked && <CheckSquare className="h-4 w-4" />}
            </button>
          </div>

          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(sender.name || sender.email)}
          </div>

          {/* Email Preview Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', message.unread && 'font-semibold')}>
                  {sender.name || sender.email}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(message.date * 1000), { addSuffix: true })}
                </span>
                {message.starred && <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Subject Line - Always Show */}
            {!isExpanded && (
              <p className={cn(
                'text-sm mb-1.5 truncate',
                message.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'
              )}>
                {message.subject || '(no subject)'}
              </p>
            )}

            {!isExpanded && (
              <>
                {/* AI Summary or Email Preview */}
                <div className="flex items-start gap-2 pr-2 mb-3">
                  {isSummaryLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mt-1 flex-shrink-0" />
                  )}
                  {hasAISummary && !isSummaryLoading && (
                    <Sparkles className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                  )}
                  <p
                    className={cn(
                      'text-sm line-clamp-3 flex-1 leading-relaxed',
                      hasAISummary ? 'text-foreground' : 'text-muted-foreground',
                      message.unread && 'font-medium'
                    )}
                  >
                    {displayText}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => handleAction(e, 'reply')}
                    title="Reply"
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => handleAction(e, 'reply-all')}
                    title="Reply All"
                  >
                    <ReplyAll className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => handleAction(e, 'forward')}
                    title="Forward"
                  >
                    <Forward className="h-4 w-4" />
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2",
                      message.starred ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-yellow-500"
                    )}
                    onClick={(e) => handleAction(e, message.starred ? 'unstar' : 'star')}
                    title={message.starred ? "Unstar" : "Star"}
                  >
                    <Star className={cn("h-4 w-4", message.starred && "fill-current")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={(e) => handleAction(e, message.unread ? 'markRead' : 'markUnread')}
                    title={message.unread ? "Mark as read" : "Mark as unread"}
                  >
                    {message.unread ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleAction(e, 'delete')}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>
                      {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {/* Labels */}
                {message.labels && message.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {message.labels.slice(0, 3).map((label, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {label}
                      </span>
                    ))}
                    {message.labels.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                        +{message.labels.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Email Content - Dropdown */}
      {isExpanded && (
        <div className="border-t border-border bg-card animate-in slide-in-from-top-2 flex flex-col max-h-[600px]">
          {/* Fixed Header: Email Details + Action Buttons */}
          <div className="flex-shrink-0 border-b border-border bg-card">
            <div className="p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                {/* Left side: Avatar + Email Info */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {getInitials(sender.name || sender.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{sender.name || sender.email}</p>
                    <p className="text-sm text-muted-foreground truncate">{sender.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(new Date(message.date * 1000))}
                    </p>
                  </div>
                </div>

                {/* Right side: Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => handleAction(e, 'reply')}
                    className="gap-1.5"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    Reply
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleAction(e, 'reply-all')}
                    className="gap-1.5"
                  >
                    <ReplyAll className="h-3.5 w-3.5" />
                    Reply All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleAction(e, 'forward')}
                    className="gap-1.5"
                  >
                    <Forward className="h-3.5 w-3.5" />
                    Forward
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleAction(e, 'archive')}
                    className="gap-1.5"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleAction(e, 'delete')}
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Labels */}
              {message.labels && message.labels.length > 0 && (
                <div className="flex items-center gap-2">
                  {message.labels.map((label: string) => (
                    <span
                      key={label}
                      className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Email Body */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {loadingFullEmail ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading full email...</span>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm break-words overflow-wrap-anywhere">
                {displayEmail.body ? (
                  <div
                    className="email-content break-words whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHTML(displayEmail.body),
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {displayEmail.snippet || '(No content)'}
                  </div>
                )}
              </div>
            )}

            {/* Attachments */}
            {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <h4 className="text-sm font-medium mb-3">Attachments ({message.attachments.length})</h4>
                <div className="space-y-2">
                  {message.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-2.5 border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded bg-muted flex items-center justify-center">
                          {attachment.content_type.includes('pdf') ? (
                            <span className="text-red-500 font-semibold text-xs">PDF</span>
                          ) : attachment.content_type.includes('sheet') ? (
                            <span className="text-green-500 font-semibold text-xs">XLS</span>
                          ) : (
                            <span className="text-blue-500 font-semibold text-xs">FILE</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{attachment.filename}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const response = await fetch(
                              `/api/nylas-v3/messages/${message.id}/attachments/${attachment.id}?accountId=${accountId}`
                            );
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = attachment.filename;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            console.error('Download error:', error);
                          }
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Thread Summary Panel */}
      {showThread && message.threadId && (
        <ThreadSummaryPanelV3
          threadId={message.threadId}
          onEmailClick={(emailId) => {
            console.log('Navigate to email:', emailId);
          }}
          onClose={() => setShowThread(false)}
        />
      )}
    </div>
  );
}
