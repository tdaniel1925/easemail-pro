'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Archive,
  Trash2,
  Clock,
  Mail,
  MailOpen,
  Star,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoverQuickActionsProps {
  isVisible: boolean;
  isRead: boolean;
  isStarred: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onSnooze: () => void;
  onToggleRead: () => void;
  onToggleStar: () => void;
  onMoreOptions: () => void;
  className?: string;
}

export function HoverQuickActions({
  isVisible,
  isRead,
  isStarred,
  onArchive,
  onDelete,
  onSnooze,
  onToggleRead,
  onToggleStar,
  onMoreOptions,
  className,
}: HoverQuickActionsProps) {
  if (!isVisible) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0',
          'bg-background/95 backdrop-blur-sm rounded shadow-md border px-0.5 py-0.5',
          'animate-in fade-in zoom-in-95 duration-100',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
            >
              <Archive className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs py-1 px-2">
            <p>Archive</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs py-1 px-2">
            <p>Delete</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onSnooze();
              }}
            >
              <Clock className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs py-1 px-2">
            <p>Snooze</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead();
              }}
            >
              {isRead ? (
                <Mail className="h-3 w-3" />
              ) : (
                <MailOpen className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs py-1 px-2">
            <p>{isRead ? 'Mark unread' : 'Mark read'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-5 w-5 p-0',
                isStarred && 'text-yellow-500 hover:text-yellow-600'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar();
              }}
            >
              <Star className={cn('h-3 w-3', isStarred && 'fill-current')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs py-1 px-2">
            <p>{isStarred ? 'Unstar' : 'Star'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onMoreOptions();
              }}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs py-1 px-2">
            <p>More</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
