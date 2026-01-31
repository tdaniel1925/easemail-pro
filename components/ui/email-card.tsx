/**
 * EmailCard Component
 * Modern card-based email list item
 * Replacement for dense table rows with better visual hierarchy
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Paperclip,
  Star,
  Archive,
  Trash2,
  MoreVertical,
  Reply,
  Forward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface EmailCardProps {
  id: string;
  from: {
    name?: string;
    email: string;
  };
  subject: string;
  snippet?: string;
  date: Date | string;
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  attachmentsCount?: number;
  labels?: string[];
  onClick?: () => void;
  onStar?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  onForward?: () => void;
  className?: string;
}

export function EmailCard({
  id,
  from,
  subject,
  snippet,
  date,
  isRead = false,
  isStarred = false,
  hasAttachments = false,
  attachmentsCount = 0,
  labels = [],
  onClick,
  onStar,
  onArchive,
  onDelete,
  onReply,
  onForward,
  className,
}: EmailCardProps) {
  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  const timeAgo = formatDistanceToNow(parsedDate, { addSuffix: true });

  // Get initials for avatar
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email ? email[0].toUpperCase() : '?';
  };

  // Strip HTML tags from snippet
  const stripHtml = (html: string) => {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');

    // Decode common HTML entities
    const entityMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    text = text.replace(/&[a-z]+;|&#\d+;/gi, (match) => {
      return entityMap[match.toLowerCase()] || match;
    });

    // Replace multiple spaces with single space
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  };

  const initials = getInitials(from.name, from.email);

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-border bg-card p-4 transition-smooth',
        'hover:shadow-md hover:border-primary/20',
        !isRead && 'bg-primary/5 border-primary/10',
        'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium',
            isRead
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary/10 text-primary'
          )}
        >
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Name + Time */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                'truncate text-sm',
                isRead ? 'font-normal text-foreground' : 'font-semibold text-foreground'
              )}>
                {from.name || from.email}
              </span>

              {labels.length > 0 && (
                <div className="flex gap-1">
                  {labels.slice(0, 2).map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs px-1.5 py-0">
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {hasAttachments && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" />
                  {attachmentsCount > 0 && attachmentsCount}
                </span>
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo.replace('about ', '')}
              </span>
            </div>
          </div>

          {/* Subject */}
          <div className={cn(
            'mb-1 text-sm truncate',
            isRead ? 'font-normal text-foreground' : 'font-semibold text-foreground'
          )}>
            {subject || '(no subject)'}
          </div>

          {/* Snippet */}
          {snippet && (
            <p className="text-sm text-muted-foreground truncate-2">
              {stripHtml(snippet)}
            </p>
          )}
        </div>

        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {onStar && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onStar();
              }}
            >
              <Star
                className={cn(
                  'h-4 w-4',
                  isStarred && 'fill-yellow-400 text-yellow-400'
                )}
              />
            </Button>
          )}

          {(onArchive || onDelete || onReply || onForward) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="scale-in">
                {onReply && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onReply();
                    }}
                  >
                    <Reply className="mr-2 h-4 w-4" />
                    Reply
                  </DropdownMenuItem>
                )}
                {onForward && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onForward();
                    }}
                  >
                    <Forward className="mr-2 h-4 w-4" />
                    Forward
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive();
                    }}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * EmailCardSkeleton - Loading state
 */
export function EmailCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-full skeleton" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 skeleton" />
            <div className="h-3 w-16 skeleton" />
          </div>
          <div className="h-4 w-3/4 skeleton" />
          <div className="h-3 w-full skeleton" />
          <div className="h-3 w-2/3 skeleton" />
        </div>
      </div>
    </div>
  );
}

/**
 * EmailCardList - Container for email cards
 */
interface EmailCardListProps {
  children: React.ReactNode;
  className?: string;
}

export function EmailCardList({ children, className }: EmailCardListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
}
