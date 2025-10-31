'use client';

/**
 * Attachments Page
 * Main page for viewing and managing email attachments
 */

import { useState, Suspense, useEffect } from 'react';
import { Loader2, LayoutGrid as Squares2X2Icon, List as ListBulletIcon, Paperclip, Upload, Sparkles, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import InboxLayout from '@/components/layout/InboxLayout';
import { SearchBar } from '@/components/attachments/SearchBar';
import { FilterBar } from '@/components/attachments/FilterBar';
import { AttachmentsGrid } from '@/components/attachments/AttachmentsGrid';
import { PreviewModal } from '@/components/attachments/PreviewModal';
import { UsageDashboard } from '@/components/attachments/UsageDashboard';
import { UploadButton } from '@/components/attachments/UploadButton';
import { useAttachments, useAttachmentStats, useDownloadAttachment } from '@/lib/attachments/hooks';
import { useAttachmentsStore } from '@/lib/attachments/store';
import type { GetAttachmentsParams } from '@/lib/attachments/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { InlineAlert } from '@/components/ui/inline-alert';
import { formatFileSize } from '@/lib/attachments/utils';
import { useQueryClient } from '@tanstack/react-query';

function AttachmentsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch AI setting with cleanup
  useEffect(() => {
    let mounted = true;
    
    fetch('/api/user/preferences')
      .then(res => res.json())
      .then(data => {
        if (mounted) setAiEnabled(data.aiAttachmentProcessing);
      })
      .catch(err => {
        if (mounted) {
          setAiEnabled(false);
          setError('Failed to load AI preferences');
        }
      });
    
    return () => { mounted = false; };
  }, []);

  // Handle AI toggle with error handling and cache invalidation
  const handleAiToggle = async (enabled: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiAttachmentProcessing: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preference');
      }

      setAiEnabled(enabled);
      setSuccess(enabled ? 'AI Analysis enabled!' : 'AI Analysis disabled');
      
      // Invalidate cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
      queryClient.invalidateQueries({ queryKey: ['attachmentStats'] });
      
      // Auto-dismiss success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to save preference');
    } finally {
      setSaving(false);
    }
  };

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

  const handleOpenEmail = (emailId: string) => {
    // Navigate to inbox with email selected
    window.location.href = `/inbox?email=${emailId}`;
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

  const hasAttachments = data && data.data.length > 0;
  const hasFilters = !!(filters.search || filters.fileTypes.length > 0 || filters.documentTypes.length > 0 || filters.senders.length > 0 || filters.dateRange);

  return (
    <InboxLayout>
      <div className="flex h-full flex-col bg-background">
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

        {/* Header with AI Toggle */}
        <div className="border-b bg-card px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            {/* Title & Stats */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Attachments</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data?.pagination.total.toLocaleString() || 0} files • {formatFileSize(stats?.totalSizeBytes || 0)}
                </p>
              </div>
              <UploadButton />
            </div>

            {/* Controls: AI Toggle + View Toggle */}
            <div className="flex items-center gap-4">
              {/* AI Toggle */}
              {aiEnabled !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">AI Attachment Analysis:</span>
                  <Switch
                    checked={aiEnabled}
                    onCheckedChange={handleAiToggle}
                    disabled={saving}
                    className="scale-90"
                  />
                  <span className={`text-xs font-medium ${
                    aiEnabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                  }`}>
                    {saving ? 'saving...' : aiEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
              )}

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

          {/* Usage Dashboard */}
          {hasAttachments && <UsageDashboard />}
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
              <AttachmentsGrid
                attachments={data.data}
                onPreview={openPreview}
                onDownload={handleDownload}
                onOpenEmail={handleOpenEmail}
              />

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
          onOpenEmail={() => previewAttachment && handleOpenEmail(previewAttachment.emailId)}
        />
      </div>
    </InboxLayout>
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

  useEffect(() => {
    // Check if user has email accounts connected
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        setHasAccounts(data?.accounts?.length > 0 || false);
        setLoading(false);
      })
      .catch(() => {
        setHasAccounts(false);
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

