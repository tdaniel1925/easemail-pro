'use client';

/**
 * Attachments Grid Component
 * Responsive grid layout for attachment cards
 */

import type { Attachment } from '@/lib/attachments/types';
import { AttachmentCard } from './AttachmentCard';

interface AttachmentsGridProps {
  attachments: Attachment[];
  onPreview: (attachment: Attachment) => void;
  onDownload: (id: string) => void;
  onShare: (attachment: Attachment) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  showCheckboxes?: boolean;
}

export function AttachmentsGrid({
  attachments,
  onPreview,
  onDownload,
  onShare,
  selectedIds = [],
  onToggleSelect,
  showCheckboxes = false,
}: AttachmentsGridProps) {
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
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {attachments.map((attachment) => (
        <AttachmentCard
          key={attachment.id}
          attachment={attachment}
          onPreview={() => onPreview(attachment)}
          onDownload={() => onDownload(attachment.id)}
          onShare={() => onShare(attachment)}
          isSelected={selectedIds.includes(attachment.id)}
          onSelect={() => onToggleSelect?.(attachment.id)}
          showCheckbox={showCheckboxes}
        />
      ))}
    </div>
  );
}

