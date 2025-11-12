'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  Archive,
  Mail,
  MailOpen,
  Star,
  FolderInput,
  X,
  CheckSquare,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsProps {
  selectedCount: number;
  onAction: (action: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}

export default function BulkActions({
  selectedCount,
  onAction,
  onSelectAll,
  onClearSelection,
}: BulkActionsProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      {/* Selection Info */}
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-blue-600">
          {selectedCount} selected
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-7 px-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-blue-200 dark:bg-blue-800" />

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction('markRead')}
          title="Mark as read"
        >
          <MailOpen className="h-4 w-4 mr-2" />
          Read
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction('markUnread')}
          title="Mark as unread"
        >
          <Mail className="h-4 w-4 mr-2" />
          Unread
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction('star')}
          title="Star"
        >
          <Star className="h-4 w-4 mr-2" />
          Star
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction('archive')}
          title="Archive"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAction('delete')}
          title="Delete"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>

        {/* More Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onAction('unstar')}>
              <Star className="h-4 w-4 mr-2" />
              Unstar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('spam')}>
              <FolderInput className="h-4 w-4 mr-2" />
              Mark as spam
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction('move')}>
              <FolderInput className="h-4 w-4 mr-2" />
              Move to folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1" />

      {/* Select All */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSelectAll}
        className="ml-auto"
      >
        <CheckSquare className="h-4 w-4 mr-2" />
        Select All
      </Button>
    </div>
  );
}
