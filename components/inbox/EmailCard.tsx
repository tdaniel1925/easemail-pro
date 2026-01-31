'use client';

import { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Star,
  Paperclip,
  ArchiveX,
  Trash2,
  MessageSquare,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SnoozeDialog } from '@/components/email/SnoozeDialog';

interface EmailCardProps {
  email: {
    id: string;
    subject: string | null;
    snippet: string | null;
    fromEmail: string | null;
    fromName: string | null;
    toEmails: Array<{ email: string; name?: string }> | null;
    receivedAt: Date | string;
    isRead: boolean | null;
    isStarred: boolean | null;
    hasAttachments: boolean | null;
    attachmentsCount: number | null;
    threadId?: string | null;
    folder?: string | null;
  };
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string) => void;
  onClick: (email: any) => void;
  onThreadClick?: (threadId: string) => void;
  threadCount?: number;
  currentFolder?: string | null;
}

function EmailCard({
  email,
  isSelected,
  isActive,
  onSelect,
  onClick,
  onThreadClick,
  threadCount = 0,
  currentFolder = null,
}: EmailCardProps) {
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);

  const getInitial = (name: string | null, email: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return '?';
  };

  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return '';
    }
  };

  const stripHtml = (html: string | null) => {
    if (!html) return '';

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

  const truncate = (text: string | null, length: number) => {
    if (!text) return '';
    // Strip HTML first, then truncate
    const cleanText = stripHtml(text);
    return cleanText.length > length ? cleanText.substring(0, length) + '...' : cleanText;
  };

  const formatRecipients = (recipients: Array<{ email: string; name?: string }> | null) => {
    if (!recipients || recipients.length === 0) return '';

    // Show first recipient
    const first = recipients[0];
    const recipientName = first.name || first.email;

    // If more than one, add count
    if (recipients.length > 1) {
      return `${recipientName} +${recipients.length - 1}`;
    }

    return recipientName;
  };

  // Check if we're in the sent folder to show recipients instead of sender
  const isSentFolder = currentFolder === 'sent' || email.folder === 'sent';

  // Display name: show recipient in sent folder, sender otherwise
  const displayName = isSentFolder
    ? formatRecipients(email.toEmails) || 'Unknown Recipient'
    : email.fromName || email.fromEmail || 'Unknown Sender';

  // Avatar initials: use recipient info for sent, sender for inbox
  const avatarInitialName = isSentFolder
    ? (email.toEmails?.[0]?.name || null)
    : email.fromName;
  const avatarInitialEmail = isSentFolder
    ? (email.toEmails?.[0]?.email || null)
    : email.fromEmail;

  const handleSnooze = async (snoozeUntil: Date) => {
    try {
      const response = await fetch('/api/emails/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          nylasAccountId: 'default', // You may need to pass the actual account ID
          snoozeUntil: snoozeUntil.toISOString(),
        }),
      });

      if (response.ok) {
        console.log('Email snoozed until', snoozeUntil);
        // Refresh the email list
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to snooze email:', error);
    }
  };

  return (
    <div
      className={cn(
        // ✨ Professional email card styling
        'relative border-b border-border px-3 sm:px-4 py-3 cursor-pointer transition-smooth group',
        'hover:bg-muted/50 active:bg-muted', // Added active state for mobile
        // Active state
        isActive && 'bg-card shadow-sm',
        // Unread state - subtle left border
        !email.isRead && 'bg-primary/5 border-l-2 border-l-primary font-medium'
      )}
      onClick={() => onClick(email)}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Checkbox - Hidden on mobile, shown on tablet+ */}
        <div
          className="pt-1 hidden sm:block"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(email.id);
          }}
        >
          <Checkbox checked={isSelected} />
        </div>

        {/* Avatar - Smaller on mobile */}
        <div
          className={cn(
            'flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm',
            email.isRead
              ? 'bg-muted-foreground/60'
              : 'bg-primary'
          )}
        >
          {getInitial(avatarInitialName, avatarInitialEmail)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'email-sender truncate',
                  email.isRead
                    ? 'text-muted-foreground'
                    : 'text-foreground'
                )}
              >
                {isSentFolder ? `To: ${displayName}` : displayName}
              </p>
              {/* Show From: in sent folder for context */}
              {isSentFolder && (email.fromName || email.fromEmail) && (
                <p className="text-xs text-muted-foreground truncate">
                  From: {email.fromName || email.fromEmail}
                </p>
              )}
              {/* Show To: field in inbox/other folders */}
              {!isSentFolder && email.toEmails && email.toEmails.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  To: {formatRecipients(email.toEmails)}
                </p>
              )}
            </div>

            {/* Date and Star */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="email-timestamp text-muted-foreground">
                {formatDate(email.receivedAt)}
              </span>
              <button
                className={cn(
                  'opacity-0 group-hover:opacity-100 transition-smooth',
                  email.isStarred && 'opacity-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  // Handle star toggle
                }}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    email.isStarred
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Subject */}
          <p
            className={cn(
              'email-subject mb-1 truncate',
              email.isRead
                ? 'text-muted-foreground'
                : 'text-foreground'
            )}
          >
            {email.subject || '(No subject)'}
          </p>

          {/* Snippet */}
          <p className="email-snippet text-muted-foreground line-clamp-2">
            {truncate(email.snippet, 150)}
          </p>

          {/* Footer Badges */}
          <div className="flex items-center gap-2 mt-2">
            {threadCount > 1 && email.threadId && (
              <Badge
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-primary/20 hover:text-primary transition-smooth"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onThreadClick && email.threadId) {
                    onThreadClick(email.threadId);
                  }
                }}
                title="View thread summary"
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                {threadCount} messages
              </Badge>
            )}
            {email.hasAttachments && (
              <Badge variant="secondary" className="text-xs">
                <Paperclip className="h-3 w-3 mr-1" />
                {email.attachmentsCount || 1}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions - Always visible on mobile, hover on desktop */}
        <div className="sm:opacity-0 sm:group-hover:opacity-100 transition-smooth flex items-center gap-0.5 sm:gap-1">
          <button
            className="p-2 hover:bg-muted rounded transition-smooth touch-target"
            onClick={(e) => {
              e.stopPropagation();
              setShowSnoozeDialog(true);
            }}
            title="Snooze"
          >
            <Clock className="h-4 w-4 text-muted-foreground hover:text-primary transition-smooth" />
          </button>
          <button
            className="p-2 hover:bg-muted rounded transition-smooth touch-target hidden sm:flex"
            onClick={(e) => {
              e.stopPropagation();
              // Handle archive
            }}
            title="Archive"
          >
            <ArchiveX className="h-4 w-4 text-muted-foreground hover:text-foreground transition-smooth" />
          </button>
          <button
            className="p-2 hover:bg-muted rounded transition-smooth touch-target"
            onClick={(e) => {
              e.stopPropagation();
              // Handle delete
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-smooth" />
          </button>
          <button
            className="p-2 hover:bg-muted rounded transition-smooth touch-target hidden sm:flex"
            onClick={async (e) => {
              e.stopPropagation();
              try {
                const response = await fetch('/api/emails/spam', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    emailId: email.id,
                    nylasAccountId: 'default' // You may need to pass the actual account ID
                  }),
                });
                if (response.ok) {
                  console.log('Email marked as spam');
                  // Refresh the email list
                  window.location.reload();
                }
              } catch (error) {
                console.error('Failed to mark as spam:', error);
              }
            }}
            title="Mark as spam"
          >
            <ShieldAlert className="h-4 w-4 text-muted-foreground hover:text-destructive transition-smooth" />
          </button>
        </div>
      </div>

      {/* Snooze Dialog */}
      <SnoozeDialog
        open={showSnoozeDialog}
        onOpenChange={setShowSnoozeDialog}
        onSnooze={handleSnooze}
        emailSubject={email.subject || undefined}
      />
    </div>
  );
}

export default memo(EmailCard);
