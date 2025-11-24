'use client';

/**
 * Attachments List Component
 * Table/list layout for attachment display
 */

import { format } from 'date-fns';
import {
  Download as ArrowDownTrayIcon,
  Eye as EyeIcon,
  Share2 as ShareIcon,
} from 'lucide-react';
import type { Attachment } from '@/lib/attachments/types';
import { formatFileSize, getFileTypeColor } from '@/lib/attachments/utils';

interface AttachmentsListProps {
  attachments: Attachment[];
  onPreview: (attachment: Attachment) => void;
  onDownload: (id: string) => void;
  onShare: (attachment: Attachment) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  showCheckboxes?: boolean;
}

export function AttachmentsList({
  attachments,
  onPreview,
  onDownload,
  onShare,
  selectedIds = [],
  onToggleSelect,
  showCheckboxes = false,
}: AttachmentsListProps) {
  if (attachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <svg
          className="h-12 w-12"
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
        <h3 className="mt-4 text-lg font-medium">No attachments found</h3>
        <p className="mt-2 text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {showCheckboxes && (
              <th className="w-12 px-3 py-3">
                <span className="sr-only">Select</span>
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              From
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Date
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {attachments.map((attachment) => {
            const ext = attachment.fileExtension?.toUpperCase() || 'FILE';
            const color = getFileTypeColor(attachment.fileExtension);
            const isSelected = selectedIds.includes(attachment.id);

            return (
              <tr
                key={attachment.id}
                className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
              >
                {showCheckboxes && onToggleSelect && (
                  <td className="px-3 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(attachment.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                )}

                {/* Filename */}
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{ color }}
                      >
                        {ext}
                      </span>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => onPreview(attachment)}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left"
                      >
                        {attachment.filename}
                      </button>
                      {attachment.documentType && attachment.documentType !== 'other' && (
                        <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 capitalize">
                          {attachment.documentType}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Type */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  {ext}
                </td>

                {/* Size */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatFileSize(attachment.fileSizeBytes)}
                </td>

                {/* Sender */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {attachment.senderName || '-'}
                  </div>
                  {attachment.senderEmail && (
                    <div className="text-xs text-gray-500">
                      {attachment.senderEmail}
                    </div>
                  )}
                </td>

                {/* Date */}
                <td className="px-6 py-4 text-sm text-gray-500">
                  {attachment.emailDate
                    ? format(new Date(attachment.emailDate), 'MMM dd, yyyy')
                    : '-'}
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onPreview(attachment)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      title="Preview"
                    >
                      <EyeIcon className="inline h-3 w-3 mr-1" size={12} />
                      Preview
                    </button>
                    <button
                      onClick={() => onDownload(attachment.id)}
                      className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 text-gray-600" size={16} />
                    </button>
                    <button
                      onClick={() => onShare(attachment)}
                      className="rounded-lg border border-gray-300 p-1.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      title="Share via email"
                    >
                      <ShareIcon className="h-4 w-4 text-gray-600" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
