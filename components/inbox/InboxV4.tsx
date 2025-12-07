'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmailCard from './EmailCard';
import EmailDetail from './EmailDetail';
import FolderNav from './FolderNav';
import SearchBar from './SearchBar';
import BulkActions from './BulkActions';
import { ThreadSummaryModal } from './ThreadSummaryModal';
import { ActiveFilters } from './ActiveFilters';
import { TrainAIButton } from './TrainAIButton';
import type { SearchFilters } from './AdvancedSearchPanel';
import {
  Mail,
  RefreshCw,
  Loader2,
  AlertCircle,
  Inbox,
  Send,
  Archive,
  Trash2,
  Star,
  FileText,
  Filter,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';

interface Email {
  id: string;
  accountId: string;
  subject: string | null;
  snippet: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: Array<{ email: string; name?: string }> | null;
  receivedAt: Date | string;
  sentAt?: Date | string | null;
  isRead: boolean | null;
  isStarred: boolean | null;
  hasAttachments: boolean | null;
  attachmentsCount: number | null;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    contentType: string;
    contentId?: string;
    url?: string;
    providerFileId?: string;
  }> | null;
  folder: string | null;
  threadId: string | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
}

interface Account {
  id: string;
  emailAddress: string;
  emailProvider: string | null;
  isDefault: boolean | null;
  syncStatus: string | null;
}

interface InboxV4Props {
  initialEmails: Email[];
  accounts: Account[];
  defaultAccountId: string | null;
  userId: string;
}

type FolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'starred';

export default function InboxV4({
  initialEmails,
  accounts,
  defaultAccountId,
  userId,
}: InboxV4Props) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(defaultAccountId);
  const [currentFolder, setCurrentFolder] = useState<FolderType>('inbox');
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(50);
  const [threadModalOpen, setThreadModalOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  // Virtual scrolling ref
  const parentRef = useRef<HTMLDivElement>(null);

  // Reset folder to inbox when account changes or on page refresh
  useEffect(() => {
    setCurrentFolder('inbox');
  }, [selectedAccount]);

  // Filter and search emails (client-side filtering when not using API search)
  const filteredEmails = useMemo(() => {
    let filtered = emails;

    // Apply folder filter
    if (currentFolder === 'starred') {
      filtered = filtered.filter(email => email.isStarred);
    } else if (currentFolder !== 'inbox') {
      filtered = filtered.filter(email => email.folder === currentFolder);
    } else {
      // Inbox: exclude trashed and archived (already filtered in initial fetch)
      filtered = filtered.filter(email => email.folder === 'inbox' || !email.folder || email.folder === '');
    }

    return filtered;
  }, [emails, currentFolder]);

  // Group emails by thread
  const emailsByThread = useMemo(() => {
    const threads = new Map<string, Email[]>();
    filteredEmails.forEach(email => {
      const threadId = email.threadId || email.id;
      if (!threads.has(threadId)) {
        threads.set(threadId, []);
      }
      threads.get(threadId)!.push(email);
    });

    // Sort emails within each thread by date
    threads.forEach(thread => {
      thread.sort((a, b) => {
        const dateA = new Date(a.receivedAt || 0).getTime();
        const dateB = new Date(b.receivedAt || 0).getTime();
        return dateB - dateA;
      });
    });

    return threads;
  }, [filteredEmails]);

  // Get display emails (one per thread, showing the latest)
  const displayEmails = useMemo(() => {
    return Array.from(emailsByThread.values()).map(thread => ({
      ...thread[0],
      threadCount: thread.length,
    }));
  }, [emailsByThread]);

  // Virtual scrolling for performance
  const rowVirtualizer = useVirtualizer({
    count: displayEmails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated height of each email card
    overscan: 5, // Render 5 extra items above and below viewport
  });

  // Fetch emails for current folder
  const fetchEmails = useCallback(async (folder: string, loadMore = false) => {
    if (!selectedAccount) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/nylas/messages?accountId=${selectedAccount}&folder=${folder}&limit=50&offset=${loadMore ? offset : 0}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        if (loadMore) {
          setEmails(prev => [...prev, ...data.messages]);
          setOffset(prev => prev + 50);
        } else {
          setEmails(data.messages);
          setOffset(50);
        }
        setHasMore(data.messages.length === 50);
      } else {
        setError(data.error || 'Failed to fetch emails');
      }
    } catch (err) {
      console.error('Error fetching emails:', err);
      setError('Failed to load emails');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccount, offset]);

  // Auto-fetch emails on mount and when account/folder changes
  useEffect(() => {
    if (selectedAccount) {
      fetchEmails(currentFolder);
    }
  }, [selectedAccount, currentFolder, fetchEmails]);

  // Sync emails
  const syncEmails = useCallback(async () => {
    if (!selectedAccount) return;

    setIsSyncing(true);
    try {
      const response = await fetch('/api/nylas/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: selectedAccount, limit: 100 }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh emails after sync
        await fetchEmails(currentFolder);
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Sync error:', err);
      setError('Failed to sync emails');
    } finally {
      setIsSyncing(false);
    }
  }, [selectedAccount, currentFolder, fetchEmails]);

  // Handle folder change
  const handleFolderChange = useCallback(async (folder: FolderType) => {
    setCurrentFolder(folder);
    setSelectedEmail(null);
    setSelectedIds(new Set());
    await fetchEmails(folder);
  }, [fetchEmails]);

  // Handle email selection
  const handleEmailClick = useCallback(async (email: Email) => {
    setSelectedEmail(email);

    // Mark as read if unread
    if (!email.isRead) {
      try {
        const response = await fetch(`/api/nylas/messages/${email.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });

        if (response.ok) {
          setEmails(prev =>
            prev.map(e => (e.id === email.id ? { ...e, isRead: true } : e))
          );
        }
      } catch (err) {
        console.error('Error marking email as read:', err);
      }
    }

    // Fetch full email body if not cached
    if (!email.bodyHtml && !email.bodyText) {
      try {
        const response = await fetch(`/api/nylas/messages/${email.id}`);
        const data = await response.json();
        if (data.success && data.message) {
          setSelectedEmail(data.message);
        }
      } catch (err) {
        console.error('Error fetching email body:', err);
      }
    }
  }, []);

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedIds.size === 0) return;

    const messageIds = Array.from(selectedIds);

    try {
      const response = await fetch('/api/nylas/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, action }),
      });

      const data = await response.json();
      if (data.success) {
        // Update local state based on action
        if (action === 'delete') {
          setEmails(prev => prev.filter(e => !selectedIds.has(e.id)));
          if (selectedEmail && selectedIds.has(selectedEmail.id)) {
            setSelectedEmail(null);
          }
        } else if (action === 'archive') {
          setEmails(prev => prev.filter(e => !selectedIds.has(e.id)));
        } else if (action === 'markRead') {
          setEmails(prev =>
            prev.map(e => (selectedIds.has(e.id) ? { ...e, isRead: true } : e))
          );
        } else if (action === 'markUnread') {
          setEmails(prev =>
            prev.map(e => (selectedIds.has(e.id) ? { ...e, isRead: false } : e))
          );
        } else if (action === 'star') {
          setEmails(prev =>
            prev.map(e => (selectedIds.has(e.id) ? { ...e, isStarred: true } : e))
          );
        } else if (action === 'unstar') {
          setEmails(prev =>
            prev.map(e => (selectedIds.has(e.id) ? { ...e, isStarred: false } : e))
          );
        }

        setSelectedIds(new Set());
      } else {
        setError(data.error || 'Bulk action failed');
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      setError('Failed to perform bulk action');
    }
  }, [selectedIds, selectedEmail]);

  // Handle search with advanced filters
  const handleSearch = useCallback(async (filters: SearchFilters) => {
    setSearchFilters(filters);

    // If no filters at all, fetch regular emails
    const hasAnyFilter = Object.keys(filters).length > 0;
    if (!hasAnyFilter) {
      await fetchEmails(currentFolder);
      return;
    }

    if (!selectedAccount) return;

    setIsLoading(true);
    try {
      // Build query params for the database search API
      const params = new URLSearchParams({ accountId: selectedAccount });

      if (filters.query) params.append('query', filters.query);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom.toISOString());
      if (filters.dateTo) params.append('dateTo', filters.dateTo.toISOString());
      if (filters.isUnread !== undefined) params.append('isUnread', String(filters.isUnread));
      if (filters.isStarred !== undefined) params.append('isStarred', String(filters.isStarred));
      if (filters.hasAttachment !== undefined) params.append('hasAttachment', String(filters.hasAttachment));

      const response = await fetch(`/api/search/emails-db?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Transform the database format to match the Email interface
        const transformedEmails = data.emails.map((email: any) => ({
          id: email.id,
          accountId: selectedAccount,
          subject: email.subject,
          snippet: email.snippet,
          fromEmail: email.from?.[0]?.email || null,
          fromName: email.from?.[0]?.name || null,
          toEmails: email.to || null,
          receivedAt: new Date(email.date * 1000),
          isRead: !email.unread,
          isStarred: email.starred || false,
          hasAttachments: email.hasAttachments || false,
          attachmentsCount: null,
          attachments: null,
          folder: email.folders?.[0] || 'inbox',
          threadId: email.thread_id,
        }));
        setEmails(transformedEmails);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccount, currentFolder, fetchEmails]);

  // Toggle email selection
  const toggleSelection = useCallback((emailId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, []);

  // Handle thread click (open AI summary modal)
  const handleThreadClick = useCallback((threadId: string) => {
    setSelectedThreadId(threadId);
    setThreadModalOpen(true);
  }, []);

  // Handle filter removal
  const handleRemoveFilter = useCallback((key: keyof SearchFilters) => {
    const newFilters = { ...searchFilters };
    delete newFilters[key];
    setSearchFilters(newFilters);
    handleSearch(newFilters);
  }, [searchFilters, handleSearch]);

  // Handle clear all filters
  const handleClearAllFilters = useCallback(() => {
    setSearchFilters({});
    fetchEmails(currentFolder);
  }, [currentFolder, fetchEmails]);

  // Select all
  const selectAll = useCallback(() => {
    if (selectedIds.size === displayEmails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayEmails.map(e => e.id)));
    }
  }, [displayEmails, selectedIds]);

  // Load more emails (infinite scroll)
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchEmails(currentFolder, true);
    }
  }, [isLoading, hasMore, currentFolder, fetchEmails]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Folder Navigation */}
      <FolderNav
        currentFolder={currentFolder}
        onFolderChange={handleFolderChange}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onAccountChange={setSelectedAccount}
      />

      {/* Email List */}
      <div className="flex-1 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Toolbar */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
          {/* Search and Sync */}
          <div className="flex items-center gap-2">
            <SearchBar onSearch={handleSearch} />
            <TrainAIButton accountId={selectedAccount} />
            <Button
              variant="outline"
              size="icon"
              onClick={syncEmails}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <BulkActions
              selectedCount={selectedIds.size}
              onAction={handleBulkAction}
              onSelectAll={selectAll}
              onClearSelection={() => setSelectedIds(new Set())}
            />
          )}
        </div>

        {/* Active Filters */}
        <ActiveFilters
          filters={searchFilters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAllFilters}
        />

        {/* Email List */}
        <div ref={parentRef} className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading && emails.length === 0 ? (
            <div className="p-4 space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : displayEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <Mail className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">No emails found</p>
              <p className="text-sm">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <>
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const email = displayEmails[virtualRow.index];
                  return (
                    <div
                      key={email.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <EmailCard
                        email={email}
                        isSelected={selectedIds.has(email.id)}
                        isActive={selectedEmail?.id === email.id}
                        onSelect={toggleSelection}
                        onClick={handleEmailClick}
                        onThreadClick={handleThreadClick}
                        threadCount={(email as any).threadCount || 0}
                        currentFolder={currentFolder}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="p-4 text-center">
                  <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Email Detail Pane */}
      {selectedEmail ? (
        <EmailDetail
          email={selectedEmail}
          accountId={selectedAccount || ''}
          onClose={() => setSelectedEmail(null)}
          onDelete={async () => {
            await handleBulkAction('delete');
            setSelectedEmail(null);
          }}
          onArchive={async () => {
            await handleBulkAction('archive');
            setSelectedEmail(null);
          }}
          onStar={async () => {
            const action = selectedEmail.isStarred ? 'unstar' : 'star';
            await handleBulkAction(action);
          }}
          thread={
            selectedEmail.threadId
              ? emailsByThread.get(selectedEmail.threadId) || [selectedEmail]
              : [selectedEmail]
          }
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <Mail className="h-20 w-20 mx-auto mb-4" />
            <p className="text-lg font-medium">Select an email to read</p>
          </div>
        </div>
      )}

      {/* Thread Summary Modal */}
      <ThreadSummaryModal
        open={threadModalOpen}
        onOpenChange={setThreadModalOpen}
        threadId={selectedThreadId}
        onEmailClick={(emailId) => {
          const email = emails.find(e => e.id === emailId);
          if (email) {
            handleEmailClick(email);
          }
        }}
      />
    </div>
  );
}
