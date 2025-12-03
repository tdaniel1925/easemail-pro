'use client';

import { useState } from 'react';
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
          'absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5',
          'bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border px-1 py-0.5',
          'animate-in fade-in zoom-in-95 duration-150',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
            >
              <Archive className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Archive (E)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Delete (#)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onSnooze();
              }}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Snooze (H)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead();
              }}
            >
              {isRead ? (
                <Mail className="h-4 w-4" />
              ) : (
                <MailOpen className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isRead ? 'Mark unread (U)' : 'Mark read (U)'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 w-7 p-0',
                isStarred && 'text-yellow-500 hover:text-yellow-600'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar();
              }}
            >
              <Star className={cn('h-4 w-4', isStarred && 'fill-current')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{isStarred ? 'Remove star (S)' : 'Star (S)'}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onMoreOptions();
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>More options</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
