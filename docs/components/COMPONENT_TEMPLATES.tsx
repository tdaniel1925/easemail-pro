/**
 * EaseMail Attachments V1 - React Component Templates
 * 
 * Component structure and boilerplate for the attachments feature
 */

// ============================================================================
// PAGE: app/attachments/page.tsx
// ============================================================================

`
'use client';

import { useState } from 'react';
import { AttachmentsHeader } from '@/components/attachments/AttachmentsHeader';
import { SearchFilterBar } from '@/components/attachments/SearchFilterBar';
import { AttachmentsGrid } from '@/components/attachments/AttachmentsGrid';
import { AttachmentsList } from '@/components/attachments/AttachmentsList';
import { PreviewModal } from '@/components/attachments/PreviewModal';
import { useAttachments } from '@/lib/attachments/hooks';
import { useAttachmentsStore } from '@/lib/attachments/store';
import type { GetAttachmentsParams } from '@/lib/attachments/types';

export default function AttachmentsPage() {
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
  } = useAttachmentsStore();

  const [page, setPage] = useState(1);

  const params: GetAttachmentsParams = {
    page,
    limit: 50,
    ...filters,
    sortBy,
    sortOrder,
  };

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useAttachments({ params });

  const handleDownload = async (attachmentId: string) => {
    // TODO: Implement download
    console.log('Download:', attachmentId);
  };

  const handleOpenEmail = (emailId: string) => {
    // Navigate to email
    window.location.href = \`/inbox?email=\${emailId}\`;
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <AttachmentsHeader
        totalCount={data?.pagination.total || 0}
        totalSize={0} // TODO: Get from stats API
        activeView={view}
        onViewChange={setView}
      />

      {/* Search & Filters */}
      <SearchFilterBar
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        {isLoading && <LoadingState />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {!isLoading && !error && data && (
          <>
            {view === 'grid' ? (
              <AttachmentsGrid
                attachments={data.data}
                onPreview={openPreview}
                onDownload={handleDownload}
                onOpenEmail={handleOpenEmail}
              />
            ) : (
              <AttachmentsList
                attachments={data.data}
                onPreview={openPreview}
                onDownload={handleDownload}
                onOpenEmail={handleOpenEmail}
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
      {previewAttachment && (
        <PreviewModal
          attachment={previewAttachment}
          isOpen={true}
          onClose={closePreview}
          onDownload={() => handleDownload(previewAttachment.id)}
          onOpenEmail={() => handleOpenEmail(previewAttachment.emailId)}
        />
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-80 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <p className="text-red-600">Error: {error.message}</p>
      <button
        onClick={onRetry}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Retry
      </button>
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
    <div className="mt-6 flex items-center justify-between">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
`

// ============================================================================
// COMPONENT: AttachmentCard
// ============================================================================

`
// components/attachments/AttachmentCard.tsx
import { PaperClipIcon, ArrowDownTrayIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import type { Attachment } from '@/lib/attachments/types';
import { formatFileSize, getFileTypeIcon, getFileTypeColor } from '@/lib/attachments/utils';
import { format } from 'date-fns';

interface AttachmentCardProps {
  attachment: Attachment;
  onPreview: () => void;
  onDownload: () => void;
  onOpenEmail: () => void;
}

export function AttachmentCard({
  attachment,
  onPreview,
  onDownload,
  onOpenEmail,
}: AttachmentCardProps) {
  const FileIcon = getFileTypeIcon(attachment.fileExtension);
  const color = getFileTypeColor(attachment.fileExtension);

  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-lg">
      {/* Thumbnail / Icon */}
      <div
        className="flex h-40 items-center justify-center"
        style={{ backgroundColor: \`\${color}15\` }}
      >
        {attachment.thumbnailPath ? (
          <img
            src={attachment.thumbnailPath}
            alt={attachment.filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <FileIcon className="h-16 w-16" style={{ color }} />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Document Type Badge */}
        {attachment.documentType && attachment.documentType !== 'other' && (
          <span className="mb-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            {attachment.documentType}
          </span>
        )}

        {/* Filename */}
        <h3 className="mb-1 truncate font-medium text-gray-900">
          {attachment.filename}
        </h3>

        {/* File Info */}
        <p className="text-sm text-gray-500">
          {formatFileSize(attachment.fileSizeBytes)} • {attachment.fileExtension?.toUpperCase()}
        </p>

        {/* Extracted Metadata (if available) */}
        {attachment.extractedMetadata && 'amount' in attachment.extractedMetadata && (
          <div className="mt-2 text-sm font-semibold text-green-600">
            \${attachment.extractedMetadata.amount?.toFixed(2)}
          </div>
        )}

        {/* Sender */}
        <div className="mt-3 border-t pt-3">
          <p className="text-xs text-gray-500">From</p>
          <p className="truncate text-sm font-medium text-gray-700">
            {attachment.senderName || attachment.senderEmail}
          </p>
        </div>

        {/* Email Subject */}
        {attachment.emailSubject && (
          <p className="mt-1 truncate text-xs text-gray-500">
            Re: {attachment.emailSubject}
          </p>
        )}

        {/* Date */}
        {attachment.emailDate && (
          <p className="mt-1 text-xs text-gray-400">
            {format(new Date(attachment.emailDate), 'MMM dd, yyyy')}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onPreview}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Preview
          </button>
          <button
            onClick={onDownload}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
            title="Download"
          >
            <ArrowDownTrayIcon className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={onOpenEmail}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"
            title="Open Email"
          >
            <EnvelopeIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
`

// ============================================================================
// COMPONENT: PreviewModal
// ============================================================================

`
// components/attachments/PreviewModal.tsx
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, ArrowDownTrayIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import type { Attachment } from '@/lib/attachments/types';

interface PreviewModalProps {
  attachment: Attachment;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  onOpenEmail: () => void;
}

export function PreviewModal({
  attachment,
  isOpen,
  onClose,
  onDownload,
  onOpenEmail,
}: PreviewModalProps) {
  const canPreview = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
    attachment.fileExtension?.toLowerCase() || ''
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-medium text-gray-900">
                      {attachment.filename}
                    </Dialog.Title>
                    <p className="text-sm text-gray-500">
                      {attachment.senderName || attachment.senderEmail}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onDownload}
                      className="rounded-lg p-2 hover:bg-gray-100"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <button
                      onClick={onOpenEmail}
                      className="rounded-lg p-2 hover:bg-gray-100"
                      title="Open Email"
                    >
                      <EnvelopeIcon className="h-6 w-6 text-gray-600" />
                    </button>
                    <button
                      onClick={onClose}
                      className="rounded-lg p-2 hover:bg-gray-100"
                    >
                      <XMarkIcon className="h-6 w-6 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex">
                  {/* Preview Area */}
                  <div className="flex-1 bg-gray-50 p-6">
                    {canPreview ? (
                      <PreviewContent attachment={attachment} />
                    ) : (
                      <NoPreviewAvailable attachment={attachment} />
                    )}
                  </div>

                  {/* Metadata Sidebar */}
                  <div className="w-80 border-l p-6">
                    <MetadataSidebar attachment={attachment} />
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function PreviewContent({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.mimeType.startsWith('image/');
  const isPDF = attachment.mimeType === 'application/pdf';

  if (isImage) {
    return (
      <img
        src={attachment.storagePath}
        alt={attachment.filename}
        className="mx-auto max-h-[70vh] rounded-lg"
      />
    );
  }

  if (isPDF) {
    return (
      <iframe
        src={attachment.storagePath}
        className="h-[70vh] w-full rounded-lg"
        title={attachment.filename}
      />
    );
  }

  return null;
}

function NoPreviewAvailable({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-gray-500">
      <p className="mb-4 text-lg">Preview not available for this file type</p>
      <p className="text-sm">{attachment.mimeType}</p>
    </div>
  );
}

function MetadataSidebar({ attachment }: { attachment: Attachment }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-medium text-gray-900">File Details</h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="font-medium">{attachment.fileExtension?.toUpperCase()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Size</dt>
            <dd className="font-medium">{formatFileSize(attachment.fileSizeBytes)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Date</dt>
            <dd className="font-medium">
              {format(new Date(attachment.emailDate), 'PPP')}
            </dd>
          </div>
        </dl>
      </div>

      {attachment.documentType && attachment.documentType !== 'other' && (
        <div>
          <h3 className="mb-2 font-medium text-gray-900">AI Classification</h3>
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="font-medium capitalize text-blue-900">
              {attachment.documentType}
            </p>
            {attachment.classificationConfidence && (
              <p className="text-sm text-blue-700">
                {(attachment.classificationConfidence * 100).toFixed(0)}% confidence
              </p>
            )}
          </div>
        </div>
      )}

      {attachment.extractedMetadata && Object.keys(attachment.extractedMetadata).length > 1 && (
        <div>
          <h3 className="mb-2 font-medium text-gray-900">Extracted Data</h3>
          <ExtractedDataDisplay metadata={attachment.extractedMetadata} />
        </div>
      )}

      {attachment.keyTerms && attachment.keyTerms.length > 0 && (
        <div>
          <h3 className="mb-2 font-medium text-gray-900">Key Terms</h3>
          <div className="flex flex-wrap gap-2">
            {attachment.keyTerms.map((term, i) => (
              <span
                key={i}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExtractedDataDisplay({ metadata }: { metadata: any }) {
  // Render extracted metadata based on type
  if ('amount' in metadata) {
    // Invoice metadata
    return (
      <dl className="space-y-2 text-sm">
        {metadata.amount && (
          <div>
            <dt className="text-gray-500">Amount</dt>
            <dd className="text-lg font-bold text-green-600">
              \${metadata.amount.toFixed(2)} {metadata.currency}
            </dd>
          </div>
        )}
        {metadata.invoiceNumber && (
          <div>
            <dt className="text-gray-500">Invoice #</dt>
            <dd className="font-medium">{metadata.invoiceNumber}</dd>
          </div>
        )}
        {metadata.dueDate && (
          <div>
            <dt className="text-gray-500">Due Date</dt>
            <dd className="font-medium">{format(new Date(metadata.dueDate), 'PP')}</dd>
          </div>
        )}
        {metadata.vendor && (
          <div>
            <dt className="text-gray-500">Vendor</dt>
            <dd className="font-medium">{metadata.vendor}</dd>
          </div>
        )}
        {metadata.paymentStatus && (
          <div>
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium capitalize">{metadata.paymentStatus}</dd>
          </div>
        )}
      </dl>
    );
  }

  // Generic fallback
  return (
    <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs">
      {JSON.stringify(metadata, null, 2)}
    </pre>
  );
}
`

// ============================================================================
// HOOK: useAttachments
// ============================================================================

`
// lib/attachments/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GetAttachmentsParams, GetAttachmentsResponse, AttachmentStats } from './types';
import { attachmentsApi } from './api';

export function useAttachments(options?: { params?: GetAttachmentsParams; enabled?: boolean }) {
  return useQuery({
    queryKey: ['attachments', options?.params],
    queryFn: () => attachmentsApi.list(options?.params),
    enabled: options?.enabled,
  });
}

export function useAttachment(id: string) {
  return useQuery({
    queryKey: ['attachment', id],
    queryFn: () => attachmentsApi.get(id),
    enabled: !!id,
  });
}

export function useAttachmentStats() {
  return useQuery({
    queryKey: ['attachments', 'stats'],
    queryFn: () => attachmentsApi.getStats(),
  });
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: (id: string) => attachmentsApi.download(id),
  });
}
`

// ============================================================================
// STORE: Zustand State Management
// ============================================================================

`
// lib/attachments/store.ts
import { create } from 'zustand';
import type { Attachment, AppliedFilters } from './types';

interface AttachmentsState {
  attachments: Attachment[];
  selectedIds: string[];
  filters: AppliedFilters;
  view: 'grid' | 'list';
  sortBy: 'date' | 'name' | 'size' | 'sender' | 'type';
  sortOrder: 'asc' | 'desc';
  previewAttachment: Attachment | null;

  // Actions
  setAttachments: (attachments: Attachment[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<AppliedFilters>) => void;
  clearFilters: () => void;
  setView: (view: 'grid' | 'list') => void;
  setSorting: (sortBy: AttachmentsState['sortBy'], sortOrder: AttachmentsState['sortOrder']) => void;
  openPreview: (attachment: Attachment) => void;
  closePreview: () => void;
}

export const useAttachmentsStore = create<AttachmentsState>((set) => ({
  attachments: [],
  selectedIds: [],
  filters: {
    fileTypes: [],
    documentTypes: [],
    senders: [],
  },
  view: 'grid',
  sortBy: 'date',
  sortOrder: 'desc',
  previewAttachment: null,

  setAttachments: (attachments) => set({ attachments }),
  
  toggleSelect: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((sid) => sid !== id)
        : [...state.selectedIds, id],
    })),
  
  selectAll: () =>
    set((state) => ({
      selectedIds: state.attachments.map((a) => a.id),
    })),
  
  clearSelection: () => set({ selectedIds: [] }),
  
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  
  clearFilters: () =>
    set({
      filters: {
        fileTypes: [],
        documentTypes: [],
        senders: [],
      },
    }),
  
  setView: (view) => set({ view }),
  
  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
  
  openPreview: (attachment) => set({ previewAttachment: attachment }),
  
  closePreview: () => set({ previewAttachment: null }),
}));
`

export {}; // Make this a module

