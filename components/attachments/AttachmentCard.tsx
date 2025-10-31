'use client';

/**
 * Attachment Card Component
 * Displays a single attachment in grid view
 */

import { format } from 'date-fns';
import {
  Paperclip as PaperClipIcon,
  Download as ArrowDownTrayIcon,
  Mail as EnvelopeIcon,
  Eye as EyeIcon,
} from 'lucide-react';
import type { Attachment } from '@/lib/attachments/types';
import { formatFileSize, getFileTypeColor, truncateFilename } from '@/lib/attachments/utils';
import { useState } from 'react';

interface AttachmentCardProps {
  attachment: Attachment;
  onPreview: () => void;
  onDownload: () => void;
  onOpenEmail: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  showCheckbox?: boolean;
}

export function AttachmentCard({
  attachment,
  onPreview,
  onDownload,
  onOpenEmail,
  isSelected = false,
  onSelect,
  showCheckbox = false,
}: AttachmentCardProps) {
  const [imageError, setImageError] = useState(false);
  const color = getFileTypeColor(attachment.fileExtension);
  const ext = attachment.fileExtension?.toUpperCase() || 'FILE';

  return (
    <div
      className={`group relative overflow-hidden rounded-lg bg-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      {/* Selection Checkbox */}
      {showCheckbox && onSelect && (
        <div className="absolute left-3 top-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Thumbnail / Icon */}
      <button
        onClick={onPreview}
        className="flex h-40 w-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${color}15` }}
      >
        {attachment.thumbnailPath && !imageError ? (
          <img
            src={`/api/attachments/${attachment.id}/preview`}
            alt={attachment.filename}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex flex-col items-center">
            <PaperClipIcon className="h-16 w-16" style={{ color }} size={64} />
            <span className="mt-2 text-sm font-semibold" style={{ color }}>
              {ext}
            </span>
          </div>
        )}
      </button>

      {/* Content */}
      <div className="p-4">
        {/* Document Type Badge */}
        {attachment.documentType && attachment.documentType !== 'other' && (
          <span className="mb-2 inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
            {attachment.documentType}
            {attachment.classificationConfidence && (
              <span className="ml-1 text-blue-600">
                ({Math.round(attachment.classificationConfidence * 100)}%)
              </span>
            )}
          </span>
        )}

        {/* Filename */}
        <h3
          className="mb-1 truncate font-medium text-gray-900"
          title={attachment.filename}
        >
          {truncateFilename(attachment.filename, 30)}
        </h3>

        {/* File Info */}
        <p className="text-sm text-gray-500">
          {formatFileSize(attachment.fileSizeBytes)} • {ext}
        </p>

        {/* Extracted Metadata */}
        {attachment.extractedMetadata && 'amount' in attachment.extractedMetadata && (
          <div className="mt-2 text-base font-semibold text-green-600">
            ${attachment.extractedMetadata.amount?.toFixed(2)}{' '}
            {attachment.extractedMetadata.currency || ''}
            {attachment.extractedMetadata.isPaid === false && (
              <span className="ml-2 text-xs font-normal text-orange-600">Unpaid</span>
            )}
          </div>
        )}

        {/* Sender */}
        {attachment.senderName && (
          <div className="mt-3 border-t pt-3">
            <p className="text-xs text-gray-500">From</p>
            <p className="truncate text-sm font-medium text-gray-700" title={attachment.senderEmail || ''}>
              {attachment.senderName}
            </p>
          </div>
        )}

        {/* Email Subject */}
        {attachment.emailSubject && (
          <p className="mt-1 truncate text-xs text-gray-500" title={attachment.emailSubject}>
            Re: {attachment.emailSubject}
          </p>
        )}

        {/* Date */}
        {attachment.emailDate && (
          <p className="mt-1 text-xs text-gray-400">
            {format(new Date(attachment.emailDate), 'MMM dd, yyyy')}
          </p>
        )}

        {/* Key Terms */}
        {attachment.keyTerms && attachment.keyTerms.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {attachment.keyTerms.slice(0, 3).map((term, i) => (
              <span
                key={i}
                className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {term}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onPreview}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <EyeIcon className="inline h-4 w-4 mr-1" size={16} />
            Preview
          </button>
          <button
            onClick={onDownload}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title="Download"
          >
            <ArrowDownTrayIcon className="h-5 w-5 text-gray-600" size={20} />
          </button>
          <button
            onClick={onOpenEmail}
            className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            title="Open Email"
          >
            <EnvelopeIcon className="h-5 w-5 text-gray-600" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

