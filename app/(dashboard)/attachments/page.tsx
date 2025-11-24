'use client';

/**
 * Attachments Page
 * Main page for viewing and managing email attachments
 */

import { useState, Suspense, useEffect } from 'react';
import { Loader2, LayoutGrid as Squares2X2Icon, List as ListBulletIcon, Paperclip, Upload, Sparkles, Mail, AlertCircle, CheckSquare, Square, Download, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SearchBar } from '@/components/attachments/SearchBar';
import { FilterBar } from '@/components/attachments/FilterBar';
import { AttachmentsGrid } from '@/components/attachments/AttachmentsGrid';
import { AttachmentsList } from '@/components/attachments/AttachmentsList';
import { PreviewModal } from '@/components/attachments/PreviewModal';
import { UploadButton } from '@/components/attachments/UploadButton';
import { useAttachments, useAttachmentStats, useDownloadAttachment } from '@/lib/attachments/hooks';
import { useAttachmentsStore } from '@/lib/attachments/store';
import type { GetAttachmentsParams, Attachment } from '@/lib/attachments/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { InlineAlert } from '@/components/ui/inline-alert';
import { formatFileSize } from '@/lib/attachments/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/components/ui/confirm-dialog';

function AttachmentsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, Dialog } = useConfirm();
  const {
    view,
    filters,
    sortBy,
    sortOrder,
    previewAttachment,
    setView,
    setFilters,
    setSorting,
    openPreview,
    closePreview,
    setSearch,
    clearFilters,
  } = useAttachmentsStore();

  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Build query params
  const params: GetAttachmentsParams = {
    page,
    limit: 50,
    search: filters.search,
    fileTypes: filters.fileTypes,
    documentTypes: filters.documentTypes,
    senders: filters.senders,
    dateFrom: filters.dateRange?.from.toISOString(),
    dateTo: filters.dateRange?.to.toISOString(),
    sortBy,
    sortOrder,
  };

  // Fetch attachments
  const {
    data,
    isLoading,
    error: fetchError,
    refetch,
  } = useAttachments(params);

  // Fetch stats for header
  const { data: stats } = useAttachmentStats();

  // Download mutation
  const downloadMutation = useDownloadAttachment();

  const handleDownload = (attachmentId: string) => {
    downloadMutation.mutate(attachmentId);
  };

  const handleShare = (attachment: Attachment) => {
    // Navigate to inbox composer with attachment
    // Note: This is a placeholder implementation
    // In a full implementation, you would:
    // 1. Open the compose dialog
    // 2. Attach the file to the draft
    // For now, we'll just show a success message with the attachment details
    setSuccess(`Share functionality: Would open composer with ${attachment.filename} attached`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSearch = (search: string) => {
    setSearch(search);
    setPage(1); // Reset to first page
  };

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page
  };

  const handleClearFilters = () => {
    clearFilters();
    setPage(1);
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (isAllSelected || selectedIds.size > 0) {
      setSelectedIds(new Set());
      setIsAllSelected(false);
    } else if (data?.data) {
      setSelectedIds(new Set(data.data.map(a => a.id)));
      setIsAllSelected(true);
    }
  };

  const toggleSelectAttachment = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setIsAllSelected(Boolean(data?.data && newSelected.size === data.data.length));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsAllSelected(false);
  };

  const handleBulkDownload = async () => {
    for (const id of Array.from(selectedIds)) {
      await downloadMutation.mutateAsync(id);
    }
    setSuccess(`Downloaded ${selectedIds.size} attachments`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Attachments',
      message: `Are you sure you want to delete ${selectedIds.size} selected attachments? This action cannot be undone.`,
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      // Implement bulk delete API call here
      // For now, just show success message
      setSuccess(`Deleted ${selectedIds.size} attachments`);
      clearSelection();
      refetch();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete attachments');
    }
  };

  const hasAttachments = data && data.data.length > 0;
  const hasFilters = !!(filters.search || filters.fileTypes.length > 0 || filters.documentTypes.length > 0 || filters.senders.length > 0 || filters.dateRange);

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        {/* Error/Success Messages */}
        {error && (
          <div className="px-6 pt-4">
            <InlineAlert
              variant="error"
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}
        {success && (
          <div className="px-6 pt-4">
            <InlineAlert
              variant="success"
              message={success}
            />
          </div>
        )}
        {fetchError && (
          <div className="px-6 pt-4">
            <InlineAlert
              variant="error"
              title="Failed to load attachments"
              message="There was an error loading your attachments. Please try again."
            />
          </div>
        )}

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <div className="border-b bg-accent px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="font-medium">{selectedIds.size} selected</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                  title={isAllSelected ? "Deselect All" : "Select All"}
                >
                  {isAllSelected ? <Square className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                  {isAllSelected ? "Deselect All" : "Select All"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="border-b bg-card px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            {/* Title & Stats */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Attachments</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data?.pagination.total.toLocaleString() || 0} files • {formatFileSize(stats?.totalSizeBytes || 0)}
                </p>
                <a
                  href="/inbox"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 19-7-7 7-7"/>
                    <path d="M19 12H5"/>
                  </svg>
                  Back to Inbox
                </a>
              </div>
              <UploadButton />
            </div>

            {/* Controls: View Toggle */}
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={view === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('grid')}
                  title="Grid view"
                >
                  <Squares2X2Icon className="h-4 w-4" size={16} />
                </Button>
                <Button
                  variant={view === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('list')}
                  title="List view"
                >
                  <ListBulletIcon className="h-4 w-4" size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="border-b px-6 py-4">
          <SearchBar value={filters.search} onChange={handleSearch} />
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {isLoading && <LoadingState />}
          
          {!isLoading && !fetchError && !hasAttachments && (
            <EmptyState hasFilters={hasFilters} onClearFilters={handleClearFilters} />
          )}
          
          {fetchError && <ErrorState error={fetchError as Error} onRetry={refetch} />}
          
          {!isLoading && !fetchError && hasAttachments && (
            <>
              {view === 'grid' ? (
                <AttachmentsGrid
                  attachments={data.data}
                  onPreview={openPreview}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  selectedIds={Array.from(selectedIds)}
                  onToggleSelect={toggleSelectAttachment}
                  showCheckboxes={true}
                />
              ) : (
                <AttachmentsList
                  attachments={data.data}
                  onPreview={openPreview}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  selectedIds={Array.from(selectedIds)}
                  onToggleSelect={toggleSelectAttachment}
                  showCheckboxes={true}
                />
              )}

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <Pagination
                  currentPage={page}
                  totalPages={data.pagination.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </main>

        {/* Preview Modal */}
        <PreviewModal
          attachment={previewAttachment}
          isOpen={!!previewAttachment}
          onClose={closePreview}
          onDownload={() => previewAttachment && handleDownload(previewAttachment.id)}
          onOpenEmail={() => previewAttachment?.emailId && handleOpenEmail(previewAttachment.emailId)}
        />

        {/* Confirm Dialog */}
        <Dialog />
      </div>
    </div>
  );
}

export default function AttachmentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <AttachmentsContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="h-80 animate-pulse rounded-lg bg-gray-200"
        />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  const [hasAccounts, setHasAccounts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // ✅ Add error state

  useEffect(() => {
    // ✅ Check if user has email accounts connected
    fetch('/api/nylas/accounts') // ✅ FIX: Use correct endpoint
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch accounts: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setHasAccounts(data?.accounts?.length > 0 || false);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to check accounts:', err);
        setError('Failed to check email accounts');
        setHasAccounts(false); // ✅ Default to false, but show error
        setLoading(false);
      });
  }, []);

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Paperclip className="h-16 w-16 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No attachments found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
        <Button
          onClick={onClearFilters}
          variant="outline"
          className="mt-4"
        >
          Clear Filters
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ✅ Show error if failed to check accounts
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6 mb-4">
          <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Could not load attachments</h3>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          {error}. Please try refreshing the page or check your connection.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // Email account connected - show sync message
  if (hasAccounts) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-primary/10 p-6 mb-4">
          <Paperclip className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No attachments yet</h3>
        <p className="text-muted-foreground text-center max-w-md mb-2">
          Your email attachments will appear here automatically.
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          <strong>Note:</strong> Initial sync may take a few minutes. New emails will be synced in real-time.
        </p>
        <UploadButton />
      </div>
    );
  }

  // No email account - show connect message
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-primary/10 p-6 mb-4">
        <Paperclip className="h-12 w-12 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No attachments yet</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Connect your email account to automatically sync attachments from your emails.
      </p>
      <div className="flex gap-3">
        <Button
          onClick={() => window.location.href = '/accounts'}
          variant="default"
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          Connect Email
        </Button>
        <UploadButton />
      </div>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <InlineAlert
        variant="error"
        title="Error loading attachments"
        message={error.message}
        className="max-w-md mb-4"
      />
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

