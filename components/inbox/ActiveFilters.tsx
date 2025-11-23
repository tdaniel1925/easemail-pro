'use client';

import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import type { SearchFilters } from './AdvancedSearchPanel';

interface ActiveFiltersProps {
  filters: SearchFilters;
  onRemoveFilter: (key: keyof SearchFilters) => void;
  onClearAll: () => void;
}

export function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
  const filterEntries = Object.entries(filters).filter(([key]) => key !== 'query');

  if (filterEntries.length === 0) {
    return null;
  }

  const formatFilterValue = (key: string, value: any): string => {
    switch (key) {
      case 'dateFrom':
        return `From: ${format(new Date(value), 'PP')}`;
      case 'dateTo':
        return `To: ${format(new Date(value), 'PP')}`;
      case 'from':
        return `From: ${value}`;
      case 'to':
        return `To: ${value}`;
      case 'subject':
        return `Subject: ${value}`;
      case 'isUnread':
        return 'Unread';
      case 'isStarred':
        return 'Starred';
      case 'hasAttachment':
        return 'Has attachment';
      default:
        return `${key}: ${value}`;
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-2 bg-muted/30 border-b">
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {filterEntries.map(([key, value]) => {
        // Skip boolean filters that are false
        if (typeof value === 'boolean' && !value) return null;

        return (
          <Badge
            key={key}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {formatFilterValue(key, value)}
            <button
              onClick={() => onRemoveFilter(key as keyof SearchFilters)}
              className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        Clear all
      </button>
    </div>
  );
}
