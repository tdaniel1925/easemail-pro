'use client';

/**
 * Preview Modal Component
 * Modal for previewing attachments
 */

import * as Dialog from '@radix-ui/react-dialog';
import {
  X as XMarkIcon,
  Download as ArrowDownTrayIcon,
  Mail as EnvelopeIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Attachment } from '@/lib/attachments/types';
import { formatFileSize } from '@/lib/attachments/utils';
import { format } from 'date-fns';

interface PreviewModalProps {
  attachment: Attachment | null;
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
  if (!attachment) return null;

  const canPreview = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(
    attachment.fileExtension?.toLowerCase() || ''
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-6xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl bg-white shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-lg font-medium text-gray-900">
                {attachment.filename}
              </Dialog.Title>
              <p className="truncate text-sm text-gray-500">
                {attachment.senderName || attachment.senderEmail}
              </p>
            </div>
            <div className="ml-4 flex gap-2">
              <button
                onClick={onDownload}
                className="rounded-lg p-2 hover:bg-gray-100"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-6 w-6 text-gray-600" size={24} />
              </button>
              <button
                onClick={onOpenEmail}
                className="rounded-lg p-2 hover:bg-gray-100"
                title="Open Email"
              >
                <EnvelopeIcon className="h-6 w-6 text-gray-600" size={24} />
              </button>
              <Dialog.Close asChild>
                <button
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <XMarkIcon className="h-6 w-6 text-gray-600" size={24} />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="flex max-h-[80vh]">
            {/* Preview Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {canPreview ? (
                <PreviewContent attachment={attachment} />
              ) : (
                <NoPreviewAvailable attachment={attachment} />
              )}
            </div>

            {/* Metadata Sidebar */}
            <div className="w-80 overflow-y-auto border-l bg-white p-6">
              <MetadataSidebar attachment={attachment} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PreviewContent({ attachment }: { attachment: Attachment }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isImage = attachment.mimeType.startsWith('image/');
  const isPDF = attachment.mimeType === 'application/pdf';

  useEffect(() => {
    let mounted = true;

    async function fetchPreviewUrl() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/attachments/${attachment.id}/preview`);

        if (!response.ok) {
          throw new Error('Failed to load preview');
        }

        const data = await response.json();

        if (mounted) {
          setPreviewUrl(data.url);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load preview');
          setLoading(false);
        }
      }
    }

    fetchPreviewUrl();

    return () => {
      mounted = false;
    };
  }, [attachment.id]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !previewUrl) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-sm">{error || 'Failed to load preview'}</p>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={previewUrl}
          alt={attachment.filename}
          className="max-h-[70vh] rounded-lg shadow-lg"
          onError={() => setError('Failed to load image')}
        />
      </div>
    );
  }

  if (isPDF) {
    return (
      <iframe
        src={previewUrl}
        className="h-[70vh] w-full rounded-lg shadow-lg"
        title={attachment.filename}
        onError={() => setError('Failed to load PDF')}
      />
    );
  }

  return null;
}

function NoPreviewAvailable({ attachment }: { attachment: Attachment }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center text-gray-500">
      <svg
        className="h-16 w-16 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p className="mt-4 text-lg font-medium">Preview not available</p>
      <p className="mt-2 text-sm">{attachment.mimeType}</p>
      <p className="mt-4 text-sm">Download to view this file</p>
    </div>
  );
}

function MetadataSidebar({ attachment }: { attachment: Attachment }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 font-medium text-gray-900">File Details</h3>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="font-medium">{attachment.fileExtension?.toUpperCase()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Size</dt>
            <dd className="font-medium">{formatFileSize(attachment.fileSizeBytes)}</dd>
          </div>
          {attachment.emailDate && (
            <div>
              <dt className="text-gray-500">Date</dt>
              <dd className="font-medium">
                {format(new Date(attachment.emailDate), 'PPP')}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {attachment.documentType && attachment.documentType !== 'other' && (
        <div>
          <h3 className="mb-3 font-medium text-gray-900">AI Classification</h3>
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
          <h3 className="mb-3 font-medium text-gray-900">Extracted Data</h3>
          <ExtractedDataDisplay metadata={attachment.extractedMetadata} />
        </div>
      )}

      {attachment.keyTerms && attachment.keyTerms.length > 0 && (
        <div>
          <h3 className="mb-3 font-medium text-gray-900">Key Terms</h3>
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
  // Invoice metadata
  if ('amount' in metadata) {
    return (
      <dl className="space-y-2 text-sm">
        {metadata.amount && (
          <div>
            <dt className="text-gray-500">Amount</dt>
            <dd className="text-lg font-bold text-green-600">
              ${metadata.amount.toFixed(2)} {metadata.currency || 'USD'}
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
            <dd className="font-medium capitalize">
              <span
                className={`inline-block rounded-full px-2 py-1 text-xs ${
                  metadata.paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-orange-100 text-orange-800'
                }`}
              >
                {metadata.paymentStatus}
              </span>
            </dd>
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

