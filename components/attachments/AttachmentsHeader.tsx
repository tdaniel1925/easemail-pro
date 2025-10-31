'use client';

/**
 * Attachments Header Component
 * Displays stats and view toggle
 */

import { LayoutGrid as Squares2X2Icon, List as ListBulletIcon } from 'lucide-react';
import { formatFileSize } from '@/lib/attachments/utils';
import { Button } from '@/components/ui/button';

interface AttachmentsHeaderProps {
  totalCount: number;
  totalSize: number;
  activeView: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}

export function AttachmentsHeader({
  totalCount,
  totalSize,
  activeView,
  onViewChange,
}: AttachmentsHeaderProps) {
  return (
    <div className="border-b bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Title & Stats */}
        <div>
          <h1 className="text-2xl font-bold">Attachments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount.toLocaleString()} files • {formatFileSize(totalSize)}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeView === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('grid')}
            title="Grid view"
          >
            <Squares2X2Icon className="h-4 w-4" size={16} />
          </Button>
          <Button
            variant={activeView === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('list')}
            title="List view"
          >
            <ListBulletIcon className="h-4 w-4" size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

