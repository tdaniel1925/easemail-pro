/**
 * Email List Enhanced v3
 * Complete email list with dropdowns, AI summaries, bulk actions, and all v1 features
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { cn, formatDate, getInitials, generateAvatarColor, formatFileSize } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { EmailRendererV3 } from '@/components/email/EmailRendererV3';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useEmailSummary } from '@/lib/hooks/useEmailSummary';
import { ThreadSummaryPanelV3 } from './thread-summary-panel-v3';
import SMSNotificationBell from '@/components/sms/SMSNotificationBell';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface EmailMessage {
  id: string;
  subject: string;
  from: Array<{ email: string; name?: string }>;
  to?: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
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
  threadEmailCount?: number; // Number of emails in this thread
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

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    location: 'all',
    from: '',
    to: '',
    subject: '',
    anywhere: '',
    dateOption: 'any',
    dateValue: '',
    dateValue2: '', // For "between" date range
    isUnread: false,
    isStarred: false,
    includeSpamTrash: false,
  });

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

  // Filter messages by search query, advanced filters, and locally deleted
  const visibleMessages = messages.filter((message) => {
    if (locallyRemovedEmails.has(message.id)) return false;

    // Simple search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const subject = message.subject?.toLowerCase() || '';
      const from = message.from?.[0]?.email?.toLowerCase() || message.from?.[0]?.name?.toLowerCase() || '';
      const snippet = message.snippet?.toLowerCase() || '';

      if (!(subject.includes(query) || from.includes(query) || snippet.includes(query))) {
        return false;
      }
    }

    // Advanced filters
    if (advancedFilters.from) {
      const from = message.from?.[0]?.email?.toLowerCase() || message.from?.[0]?.name?.toLowerCase() || '';
      if (!from.includes(advancedFilters.from.toLowerCase())) return false;
    }

    if (advancedFilters.to) {
      const toEmails = message.to?.map(t => t.email?.toLowerCase() || t.name?.toLowerCase() || '').join(' ') || '';
      const ccEmails = message.cc?.map(c => c.email?.toLowerCase() || c.name?.toLowerCase() || '').join(' ') || '';
      const allRecipients = `${toEmails} ${ccEmails}`;
      if (!allRecipients.includes(advancedFilters.to.toLowerCase())) return false;
    }

    if (advancedFilters.subject) {
      const subject = message.subject?.toLowerCase() || '';
      if (!subject.includes(advancedFilters.subject.toLowerCase())) return false;
    }

    if (advancedFilters.anywhere) {
      const query = advancedFilters.anywhere.toLowerCase();
      const subject = message.subject?.toLowerCase() || '';
      const from = message.from?.[0]?.email?.toLowerCase() || message.from?.[0]?.name?.toLowerCase() || '';
      const snippet = message.snippet?.toLowerCase() || '';
      const body = message.body?.toLowerCase() || '';

      if (!(subject.includes(query) || from.includes(query) || snippet.includes(query) || body.includes(query))) {
        return false;
      }
    }

    // Date filtering
    if (advancedFilters.dateOption !== 'any' && advancedFilters.dateValue) {
      const messageDate = message.date ? new Date(message.date * 1000) : null;
      if (messageDate) {
        const filterDate = new Date(advancedFilters.dateValue);
        filterDate.setHours(0, 0, 0, 0);
        const messageDateOnly = new Date(messageDate);
        messageDateOnly.setHours(0, 0, 0, 0);

        if (advancedFilters.dateOption === 'on-or-after') {
          if (messageDateOnly < filterDate) return false;
        } else if (advancedFilters.dateOption === 'on-or-before') {
          if (messageDateOnly > filterDate) return false;
        } else if (advancedFilters.dateOption === 'between' && advancedFilters.dateValue2) {
          const filterDate2 = new Date(advancedFilters.dateValue2);
          filterDate2.setHours(0, 0, 0, 0);
          if (messageDateOnly < filterDate || messageDateOnly > filterDate2) return false;
        }
      }
    }

    if (advancedFilters.isUnread && message.unread !== true) return false;
    if (advancedFilters.isStarred && message.starred !== true) return false;

    return true;
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

  // Fetch SMS unread count on mount and poll every 60 seconds (consolidated - was duplicate)
  useEffect(() => {
    const fetchSMSUnreadCount = async () => {
      try {
        const response = await fetch('/api/sms/unread-count');
        if (response.ok) {
          const data = await response.json();
          if (data.success && typeof data.count === 'number') {
            setSmsUnreadCount(data.count);
          }
        }
      } catch (error) {
        console.error('Failed to fetch SMS unread count:', error);
      }
    };

    // Initial fetch
    fetchSMSUnreadCount();

    // Poll every 60 seconds (reduced from 30s to minimize API calls)
    const interval = setInterval(fetchSMSUnreadCount, 60000);

    return () => clearInterval(interval);
  }, []);

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
      <div className="flex-shrink-0 min-h-[3.5rem] px-3 md:px-4 border-b border-border flex items-center">
        {selectMode ? (
          // Bulk Action Toolbar
          <div className="flex items-center gap-2 w-full overflow-x-auto">
            <button
              onClick={handleSelectAll}
              className={cn(
                'h-5 w-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
                selectedEmails.size === visibleMessages.length
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-border hover:border-primary/50 bg-background'
              )}
            >
              {selectedEmails.size === visibleMessages.length && <CheckSquare className="h-4 w-4" />}
            </button>

            <span className="text-xs md:text-sm font-medium whitespace-nowrap">{selectedEmails.size} selected</span>

            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction('delete')} className="h-8 text-xs md:text-sm">
                <Trash2 className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction('archive')} className="h-8 text-xs md:text-sm">
                <Archive className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Archive</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction('markRead')} className="h-8 text-xs md:text-sm">
                <MailOpen className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Read</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleBulkAction('markUnread')} className="h-8 text-xs md:text-sm">
                <Mail className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Unread</span>
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
              className="h-8 text-xs md:text-sm flex-shrink-0"
            >
              Cancel
            </Button>
          </div>
        ) : (
          // Normal Toolbar
          <div className="flex items-center gap-2 md:gap-4 w-full">
            <div className="flex-shrink-0">
              <h2 className="text-xs md:text-sm font-medium capitalize">{folderName}</h2>
            </div>

            {/* AI Summary Toggle - Hidden on mobile */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Switch checked={showAISummaries} onCheckedChange={handleAISummaryToggle} />
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">AI</span>
              </label>
            </div>

            {/* Search Bar with Advanced Search */}
            <div className="flex-1 relative min-w-0 flex items-center gap-1">
              <div className="flex-1 relative">
                <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 h-3.5 md:h-4 w-3.5 md:w-4 text-muted-foreground z-10" />
                <Input
                  type="search"
                  placeholder="Search emails..."
                  className="w-full pl-8 md:pl-10 pr-8 h-8 md:h-9 bg-background border-border text-xs md:text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3 md:h-4 md:w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedSearch(true)}
                className={cn(
                  "h-8 px-2 flex-shrink-0 relative",
                  (advancedFilters.from || advancedFilters.to || advancedFilters.subject || advancedFilters.anywhere ||
                   advancedFilters.dateOption !== 'any' || advancedFilters.isUnread || advancedFilters.isStarred) &&
                  "text-blue-600 dark:text-blue-400"
                )}
                title="Advanced search"
              >
                <SlidersHorizontal className="h-3.5 md:h-4 w-3.5 md:w-4" />
                {(advancedFilters.from || advancedFilters.to || advancedFilters.subject || advancedFilters.anywhere ||
                  advancedFilters.dateOption !== 'any' || advancedFilters.isUnread || advancedFilters.isStarred) && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-600" />
                )}
              </Button>
            </div>

            {/* SMS Notification Bell */}
            <SMSNotificationBell
              unreadCount={smsUnreadCount}
              onCountUpdate={(count) => setSmsUnreadCount(count)}
            />

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-1.5 md:p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
              title="Refresh"
            >
              <RefreshCw className={cn('h-3.5 md:h-4 w-3.5 md:w-4', loading && 'animate-spin')} />
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

      {/* Advanced Search Dialog */}
      <Dialog open={showAdvancedSearch} onOpenChange={setShowAdvancedSearch}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto m-4">
          <DialogHeader>
            <DialogTitle>Advanced Search</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Search Location */}
            <div className="space-y-2">
              <Label htmlFor="search-location">In</Label>
              <Select
                value={advancedFilters.location}
                onValueChange={(value) => setAdvancedFilters({ ...advancedFilters, location: value })}
              >
                <SelectTrigger id="search-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All mail</SelectItem>
                  <SelectItem value="inbox">Inbox</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="drafts">Drafts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Spam and Trash */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-spam-trash"
                checked={advancedFilters.includeSpamTrash}
                onCheckedChange={(checked) =>
                  setAdvancedFilters({ ...advancedFilters, includeSpamTrash: checked as boolean })
                }
              />
              <Label htmlFor="include-spam-trash" className="cursor-pointer">
                Include Spam and Trash
              </Label>
            </div>

            {/* From */}
            <div className="space-y-2">
              <Label htmlFor="filter-from">From</Label>
              <Input
                id="filter-from"
                placeholder="sender@example.com"
                value={advancedFilters.from}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, from: e.target.value })}
              />
            </div>

            {/* To/Cc */}
            <div className="space-y-2">
              <Label htmlFor="filter-to">To/Cc</Label>
              <Input
                id="filter-to"
                placeholder="recipient@example.com"
                value={advancedFilters.to}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, to: e.target.value })}
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="filter-subject">Subject</Label>
              <Input
                id="filter-subject"
                placeholder="Enter subject keywords"
                value={advancedFilters.subject}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, subject: e.target.value })}
              />
            </div>

            {/* Anywhere (Body) */}
            <div className="space-y-2">
              <Label htmlFor="filter-anywhere">Anywhere</Label>
              <Input
                id="filter-anywhere"
                placeholder="Search in email body"
                value={advancedFilters.anywhere}
                onChange={(e) => setAdvancedFilters({ ...advancedFilters, anywhere: e.target.value })}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="filter-date">Date</Label>
              <Select
                value={advancedFilters.dateOption}
                onValueChange={(value) => setAdvancedFilters({ ...advancedFilters, dateOption: value, dateValue: '', dateValue2: '' })}
              >
                <SelectTrigger id="filter-date">
                  <SelectValue placeholder="Any time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any time</SelectItem>
                  <SelectItem value="on-or-after">On or after</SelectItem>
                  <SelectItem value="on-or-before">On or before</SelectItem>
                  <SelectItem value="between">Between</SelectItem>
                </SelectContent>
              </Select>
              {advancedFilters.dateOption === 'between' ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label htmlFor="date-from" className="text-xs text-muted-foreground">From</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={advancedFilters.dateValue}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateValue: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to" className="text-xs text-muted-foreground">To</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={advancedFilters.dateValue2}
                      onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateValue2: e.target.value })}
                    />
                  </div>
                </div>
              ) : advancedFilters.dateOption !== 'any' && (
                <Input
                  type="date"
                  value={advancedFilters.dateValue}
                  onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateValue: e.target.value })}
                  className="mt-2"
                />
              )}
            </div>

            {/* Is Unread */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-unread"
                checked={advancedFilters.isUnread}
                onCheckedChange={(checked) =>
                  setAdvancedFilters({ ...advancedFilters, isUnread: checked as boolean })
                }
              />
              <Label htmlFor="filter-unread" className="cursor-pointer">
                Is unread
              </Label>
            </div>

            {/* Is Starred */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="filter-starred"
                checked={advancedFilters.isStarred}
                onCheckedChange={(checked) =>
                  setAdvancedFilters({ ...advancedFilters, isStarred: checked as boolean })
                }
              />
              <Label htmlFor="filter-starred" className="cursor-pointer">
                Is starred
              </Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setAdvancedFilters({
                  location: 'all',
                  from: '',
                  to: '',
                  subject: '',
                  anywhere: '',
                  dateOption: 'any',
                  dateValue: '',
                  dateValue2: '',
                  isUnread: false,
                  isStarred: false,
                  includeSpamTrash: false,
                });
              }}
              className="sm:mr-auto"
            >
              Clear All Filters
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedSearch(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowAdvancedSearch(false);
                  // Filters are already applied via visibleMessages
                }}
              >
                Search
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  const [showPopup, setShowPopup] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [showThreadPreview, setShowThreadPreview] = useState(false);
  const [threadPreviewData, setThreadPreviewData] = useState<any>(null);
  const [loadingThreadPreview, setLoadingThreadPreview] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);

  // Viewport detection for previews
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true,
  });

  // Smart preview extraction - get first 2-3 lines from snippet/body
  const extractSmartPreview = (text: string, maxLines: number = 3): string => {
    if (!text) return '';

    // Remove extra whitespace and newlines
    const cleaned = text.replace(/\s+/g, ' ').trim();

    // Split into sentences
    const sentences = cleaned.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);

    // Take first 2-3 sentences or up to 300 characters
    const preview = sentences.slice(0, maxLines).join('. ');

    return preview.length > 300 ? preview.substring(0, 300) + '...' : preview + (sentences.length > 0 ? '.' : '');
  };

  // Highlight dates, names, and important keywords
  const highlightText = (text: string): JSX.Element => {
    // Regex patterns
    const datePattern = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi;
    const timePattern = /\b\d{1,2}:\d{2}\s*(am|pm|AM|PM)?\b/g;
    const urlPattern = /(https?:\/\/[^\s]+)/g;

    let result = text;
    const highlights: { start: number; end: number; type: string }[] = [];

    // Find all matches
    let match;
    while ((match = datePattern.exec(text)) !== null) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'date' });
    }
    while ((match = timePattern.exec(text)) !== null) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'time' });
    }
    while ((match = urlPattern.exec(text)) !== null) {
      highlights.push({ start: match.index, end: match.index + match[0].length, type: 'url' });
    }

    // Sort highlights by position
    highlights.sort((a, b) => a.start - b.start);

    // Build JSX with highlights
    if (highlights.length === 0) {
      return <>{text}</>;
    }

    const elements: JSX.Element[] = [];
    let lastEnd = 0;

    highlights.forEach((h, idx) => {
      // Add text before highlight
      if (h.start > lastEnd) {
        elements.push(<span key={`text-${idx}`}>{text.substring(lastEnd, h.start)}</span>);
      }

      // Add highlighted text
      const highlightClass = h.type === 'date' ? 'text-blue-600 dark:text-blue-400 font-medium' :
                            h.type === 'time' ? 'text-green-600 dark:text-green-400 font-medium' :
                            'text-purple-600 dark:text-purple-400 underline';

      elements.push(
        <span key={`highlight-${idx}`} className={highlightClass}>
          {text.substring(h.start, h.end)}
        </span>
      );

      lastEnd = h.end;
    });

    // Add remaining text
    if (lastEnd < text.length) {
      elements.push(<span key="text-end">{text.substring(lastEnd)}</span>);
    }

    return <>{elements}</>;
  };

  const smartPreview = extractSmartPreview(message.snippet || message.body || '');

  // Handle hover for popup (only when not expanded)
  const handleMouseEnter = () => {
    if (showAISummaries && !isExpanded) {
      setShowPopup(true);
    }
  };

  const handleMouseLeave = () => {
    setShowPopup(false);
  };

  // Mount detection for portal (SSR safety)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch AI summary when AI summaries are enabled and email is in view
  useEffect(() => {
    if (showAISummaries && inView && !aiSummary && !loadingAiSummary) {
      const fetchAiSummary = async () => {
        setLoadingAiSummary(true);
        try {
          // First, try to fetch existing summary
          const getResponse = await fetch(
            `/api/email-summaries?messageIds=${message.id}&accountId=${accountId}`
          );
          const getData = await getResponse.json();

          if (getData.success && getData.summaries[message.id]) {
            setAiSummary(getData.summaries[message.id]);
            setLoadingAiSummary(false);
            return;
          }

          // If no cached summary, generate a new one
          // First fetch the full email content
          const emailResponse = await fetch(
            `/api/nylas-v3/messages/${message.id}?accountId=${accountId}`
          );
          const emailData = await emailResponse.json();

          if (emailData.success && emailData.message) {
            const emailContent = emailData.message.body || emailData.message.snippet;

            // Generate AI summary
            const summaryResponse = await fetch('/api/email-summaries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messageId: message.id,
                accountId,
                emailContent,
                subject: message.subject,
              }),
            });

            const summaryData = await summaryResponse.json();
            if (summaryData.success) {
              setAiSummary(summaryData.summary);
            }
          }
        } catch (error) {
          console.error('Failed to fetch AI summary:', error);
        } finally {
          setLoadingAiSummary(false);
        }
      };

      fetchAiSummary();
    }
  }, [showAISummaries, inView, message.id, accountId, aiSummary, loadingAiSummary]);

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
  // Use AI summary if available, otherwise fall back to smart preview or snippet
  const displayText = showAISummaries && aiSummary ? aiSummary : (smartPreview || message.snippet);
  const showSmartPreview = showAISummaries && (!!aiSummary || loadingAiSummary);

  // Fetch thread preview data
  const fetchThreadPreview = async () => {
    if (!message.threadId || threadPreviewData || loadingThreadPreview) return;

    setLoadingThreadPreview(true);
    try {
      const response = await fetch(`/api/threads/${message.threadId}`);
      if (response.ok) {
        const data = await response.json();
        setThreadPreviewData(data.thread);
      }
    } catch (error) {
      console.error('Failed to fetch thread preview:', error);
    } finally {
      setLoadingThreadPreview(false);
    }
  };

  // Handle thread badge hover
  const handleThreadBadgeMouseEnter = () => {
    setShowThreadPreview(true);
    fetchThreadPreview();
  };

  const handleThreadBadgeMouseLeave = () => {
    setShowThreadPreview(false);
  };

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
        'border border-border/50 rounded-lg transition-all bg-card overflow-hidden cursor-pointer relative',
        'hover:shadow-md hover:-translate-y-0.5',
        !message.unread && 'bg-card',
        message.unread && 'bg-accent/30',
        isSelected && 'ring-2 ring-primary ring-offset-1'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* AI Summary Popup - Rendered via Portal */}
      {showPopup && isMounted && createPortal(
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-[480px] bg-popover border-2 border-primary rounded-xl shadow-2xl overflow-hidden">
          {/* Header with Sender Info */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
            <div className="flex items-start gap-3">
              {/* Sender Avatar */}
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                style={{
                  backgroundColor: generateAvatarColor(
                    message.from[0]?.email || message.from[0]?.name || 'Unknown'
                  ),
                }}
              >
                {getInitials(message.from[0]?.name || message.from[0]?.email || 'U')}
              </div>

              {/* Sender Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold truncate">
                    {message.from[0]?.name || message.from[0]?.email}
                  </h4>
                  {/* Priority Badge */}
                  {message.unread && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300 text-[10px] font-medium">
                      <Bell className="h-2.5 w-2.5" />
                      Priority
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {message.from[0]?.email}
                </p>
                {message.hasAttachments && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      {message.attachments?.length || 1} attachment{(message.attachments?.length ?? 0) > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Category Tags */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {/* Auto-detect categories based on email content */}
              {message.from[0]?.email?.includes('noreply') || message.from[0]?.email?.includes('newsletter') ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
                  <Tag className="h-2.5 w-2.5" />
                  Newsletter
                </span>
              ) : message.subject?.toLowerCase().includes('invoice') || message.subject?.toLowerCase().includes('receipt') ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] font-medium">
                  <Tag className="h-2.5 w-2.5" />
                  Finance
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-medium">
                  <Tag className="h-2.5 w-2.5" />
                  Work
                </span>
              )}

            </div>
          </div>

          {/* Smart Preview Section */}
          <div className="p-4 border-b border-border">
            <div className="flex items-start gap-2 mb-2">
              <MailIcon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <h4 className="text-sm font-semibold">Email Preview</h4>
            </div>
            {smartPreview ? (
              <p className="text-sm text-foreground leading-relaxed">
                {highlightText(smartPreview)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No preview available
              </p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                Dates
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                Times
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                Links
              </span>
            </div>
          </div>

          {/* Attachment Previews */}
          {message.hasAttachments && message.attachments && message.attachments.length > 0 && (
            <div className="p-4 border-b border-border">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                Attachments ({message.attachments.length})
              </h4>
              <div className="flex gap-2 flex-wrap">
                {message.attachments.slice(0, 3).map((attachment: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-2 py-1.5 bg-accent rounded-md text-xs max-w-[140px]"
                  >
                    <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{attachment.filename || `Attachment ${idx + 1}`}</span>
                  </div>
                ))}
                {message.attachments.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2 py-1.5">
                    +{message.attachments.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="p-4 bg-accent/30">
            <h4 className="text-xs font-semibold text-muted-foreground mb-3">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopup(false);
                  onCompose?.('reply', message);
                }}
              >
                <Reply className="h-3 w-3 mr-1.5" />
                Reply
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopup(false);
                  onCompose?.('forward', message);
                }}
              >
                <Forward className="h-3 w-3 mr-1.5" />
                Forward
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopup(false);
                  handleAction(e, 'markRead');
                }}
              >
                <MailOpen className="h-3 w-3 mr-1.5" />
                Mark Read
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full justify-start text-xs h-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopup(false);
                  handleAction(e, 'delete');
                }}
              >
                <Trash2 className="h-3 w-3 mr-1.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
                {/* Show To: recipient if available */}
                {message.to && message.to.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    To: {message.to[0].name || message.to[0].email}
                    {message.to.length > 1 && ` +${message.to.length - 1} more`}
                  </p>
                )}
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

            {/* Subject Line with Thread Badge */}
            {!isExpanded && (
              <div className="flex items-center gap-2 mb-1.5">
                <p className={cn(
                  'text-sm truncate flex-1',
                  message.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'
                )}>
                  {message.subject || '(no subject)'}
                </p>
                {/* Thread Indicator Badge - Only show if thread has multiple emails */}
                {message.threadId && message.threadId.trim() !== '' && (message.threadEmailCount ?? 1) > 1 && (
                  <div
                    className="relative flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs flex-shrink-0 shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
                    onMouseEnter={handleThreadBadgeMouseEnter}
                    onMouseLeave={handleThreadBadgeMouseLeave}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span className="font-semibold">{message.threadEmailCount}</span>

                    {/* Thread Preview Popup */}
                    {showThreadPreview && isMounted && createPortal(
                      <div
                        className="fixed z-[10000] bg-popover border-2 border-primary rounded-lg shadow-2xl p-4 w-[380px] animate-in fade-in zoom-in-95 duration-150"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                        onMouseEnter={() => setShowThreadPreview(true)}
                        onMouseLeave={() => setShowThreadPreview(false)}
                      >
                        {loadingThreadPreview ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading thread...</span>
                          </div>
                        ) : threadPreviewData ? (
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-center gap-2 pb-3 border-b border-border">
                              <MessageSquare className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-semibold">Thread Preview</h4>
                              <span className="ml-auto text-xs text-muted-foreground">
                                {threadPreviewData.emailCount} emails
                              </span>
                            </div>

                            {/* Participants */}
                            {threadPreviewData.participants && threadPreviewData.participants.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Participants</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {threadPreviewData.participants.slice(0, 4).map((p: any, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 bg-accent rounded-full text-xs"
                                    >
                                      {p.name || p.email}
                                    </span>
                                  ))}
                                  {threadPreviewData.participants.length > 4 && (
                                    <span className="px-2 py-0.5 text-xs text-muted-foreground">
                                      +{threadPreviewData.participants.length - 4} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* AI Summary */}
                            {threadPreviewData.aiSummary && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                                  <p className="text-xs font-medium text-muted-foreground">AI Summary</p>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed line-clamp-3">
                                  {threadPreviewData.aiSummary}
                                </p>
                              </div>
                            )}

                            {/* Latest Email */}
                            {threadPreviewData.emails && threadPreviewData.emails.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Latest Email</p>
                                <div className="bg-accent/50 rounded-md p-2">
                                  <p className="text-xs font-medium truncate">
                                    {threadPreviewData.emails[0].fromName || threadPreviewData.emails[0].fromEmail}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {threadPreviewData.emails[0].snippet}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Click to view full */}
                            <div className="pt-2 border-t border-border">
                              <button
                                className="w-full text-xs text-primary hover:text-primary/80 font-medium flex items-center justify-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowThreadPreview(false);
                                  setShowThread(true);
                                }}
                              >
                                <Sparkles className="h-3 w-3" />
                                View Full Thread Summary
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-sm text-muted-foreground py-4">
                            No thread data available
                          </div>
                        )}
                      </div>,
                      document.body
                    )}
                  </div>
                )}
              </div>
            )}

            {!isExpanded && (
              <>
                {/* AI Summary or Email Snippet */}
                <div className="flex items-start gap-2 pr-2 mb-3">
                  {showAISummaries && aiSummary && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Sparkles className="h-3 w-3 text-purple-500 mt-1" />
                    </div>
                  )}
                  {loadingAiSummary && showAISummaries && (
                    <Loader2 className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0 animate-spin" />
                  )}
                  {!showAISummaries && showSmartPreview && (
                    <MailIcon className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                  )}
                  <p
                    className={cn(
                      'text-sm line-clamp-3 flex-1 leading-relaxed',
                      showAISummaries && aiSummary ? 'text-foreground font-medium' :
                      showSmartPreview ? 'text-foreground' : 'text-muted-foreground',
                      message.unread && 'font-medium'
                    )}
                  >
                    {loadingAiSummary && showAISummaries ? (
                      <span className="text-muted-foreground italic">Generating AI summary...</span>
                    ) : (
                      displayText
                    )}
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
                  {/* AI Thread Summary Button - only show if thread has 2+ emails */}
                  {message.threadId && message.threadEmailCount && message.threadEmailCount >= 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 px-2",
                        showThread ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowThread(!showThread);
                      }}
                      title="View AI Thread Summary"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  )}
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
              <EmailRendererV3
                emailId={message.id}
                messageId={message.id}
                accountId={accountId}
                bodyHtml={displayEmail.body}
                bodyText={displayEmail.snippet}
                attachments={message.attachments?.map(att => ({
                  id: att.id,
                  filename: att.filename,
                  size: att.size,
                  contentType: att.content_type
                })) || null}
              />
            )}

            {/* Attachments - Disabled because EmailRendererV3 handles them */}
            {false && message.hasAttachments && (message.attachments?.length ?? 0) > 0 && (
              <div className="mt-5 pt-5 border-t border-border">
                <h4 className="text-sm font-medium mb-3">Attachments ({message.attachments?.length})</h4>
                <div className="space-y-2">
                  {message.attachments?.map((attachment) => (
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
                            // Pass IDs as query parameters to avoid URL encoding issues with special characters
                            const params = new URLSearchParams({
                              accountId: accountId,
                              messageId: message.id,
                              attachmentId: attachment.id,
                            });

                            const response = await fetch(
                              `/api/nylas-v3/messages/download/attachment?${params.toString()}`
                            );

                            if (!response.ok) {
                              const errorData = await response.json();
                              throw new Error(errorData.details || 'Failed to download attachment');
                            }

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
                            alert(`Failed to download attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      {/* Thread Summary Panel with Animation */}
      {showThread && message.threadId && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <ThreadSummaryPanelV3
            threadId={message.threadId}
            onEmailClick={(emailId) => {
              console.log('Navigate to email:', emailId);
            }}
            onClose={() => setShowThread(false)}
          />
        </div>
      )}
    </div>
  );
}
