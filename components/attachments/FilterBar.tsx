'use client';

/**
 * Filter Bar Component
 * Filters for file type, date range, document type
 */

import { Filter as FunnelIcon, X as XMarkIcon, ArrowUp, ArrowDown } from 'lucide-react';
import type { AppliedFilters, DocumentType, AttachmentDirection } from '@/lib/attachments/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  filters: AppliedFilters;
  onFiltersChange: (filters: Partial<AppliedFilters>) => void;
  onClearFilters: () => void;
}

export function FilterBar({
  filters,
  onFiltersChange,
  onClearFilters,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const fileTypeOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'jpg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
    { value: 'docx', label: 'Word' },
    { value: 'xlsx', label: 'Excel' },
  ];

  const documentTypeOptions: { value: DocumentType; label: string }[] = [
    { value: 'invoice', label: 'Invoice' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'contract', label: 'Contract' },
    { value: 'report', label: 'Report' },
    { value: 'image', label: 'Image' },
  ];

  const directionOptions: { value: AttachmentDirection | undefined; label: string }[] = [
    { value: undefined, label: 'All' },
    { value: 'received', label: 'Received' },
    { value: 'sent', label: 'Sent' },
  ];

  const activeFilterCount =
    filters.fileTypes.length +
    filters.documentTypes.length +
    filters.senders.length +
    (filters.dateRange ? 1 : 0) +
    (filters.direction ? 1 : 0);

  return (
    <div className="border-b bg-card px-6 py-3">
      <div className="flex items-center gap-4">
        {/* Filter Toggle Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <FunnelIcon className="h-4 w-4" size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Active Filter Chips */}
        {filters.fileTypes.length > 0 && (
          <div className="flex items-center gap-2">
            {filters.fileTypes.map((type) => (
              <FilterChip
                key={type}
                label={type.toUpperCase()}
                onRemove={() =>
                  onFiltersChange({
                    fileTypes: filters.fileTypes.filter((t) => t !== type),
                  })
                }
              />
            ))}
          </div>
        )}

        {filters.documentTypes.length > 0 && (
          <div className="flex items-center gap-2">
            {filters.documentTypes.map((type) => (
              <FilterChip
                key={type}
                label={type}
                onRemove={() =>
                  onFiltersChange({
                    documentTypes: filters.documentTypes.filter((t) => t !== type),
                  })
                }
              />
            ))}
          </div>
        )}

        {filters.direction && (
          <FilterChip
            label={filters.direction === 'sent' ? 'Sent' : 'Received'}
            onRemove={() => onFiltersChange({ direction: undefined })}
          />
        )}

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* File Type Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              File Type
            </label>
            <div className="flex flex-wrap gap-2">
              {fileTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.fileTypes.includes(option.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const isSelected = filters.fileTypes.includes(option.value);
                    onFiltersChange({
                      fileTypes: isSelected
                        ? filters.fileTypes.filter((t) => t !== option.value)
                        : [...filters.fileTypes, option.value],
                    });
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Document Type Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Document Type (AI)
            </label>
            <div className="flex flex-wrap gap-2">
              {documentTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filters.documentTypes.includes(option.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const isSelected = filters.documentTypes.includes(option.value);
                    onFiltersChange({
                      documentTypes: isSelected
                        ? filters.documentTypes.filter((t) => t !== option.value)
                        : [...filters.documentTypes, option.value],
                    });
                  }}
                  className="capitalize"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Direction Filter */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Direction
            </label>
            <div className="flex flex-wrap gap-2">
              {directionOptions.map((option) => (
                <Button
                  key={option.value || 'all'}
                  variant={filters.direction === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onFiltersChange({ direction: option.value })}
                  className="gap-1"
                >
                  {option.value === 'sent' && <ArrowUp className="h-3 w-3" />}
                  {option.value === 'received' && <ArrowDown className="h-3 w-3" />}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Date Range
            </label>
            <select
              onChange={(e) => {
                const preset = e.target.value;
                if (!preset) {
                  onFiltersChange({ dateRange: undefined });
                  return;
                }

                const now = new Date();
                let from: Date;

                switch (preset) {
                  case 'last7days':
                    from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                  case 'last30days':
                    from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                  case 'last90days':
                    from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                  default:
                    return;
                }

                onFiltersChange({ dateRange: { from, to: now } });
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">All time</option>
              <option value="last7days">Last 7 days</option>
              <option value="last30days">Last 30 days</option>
              <option value="last90days">Last 90 days</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
      <span className="capitalize">{label}</span>
      <button
        onClick={onRemove}
        className="hover:opacity-70"
      >
        <XMarkIcon className="h-4 w-4" size={16} />
      </button>
    </span>
  );
}

