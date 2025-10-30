'use client';

import { useState, useEffect } from 'react';
import { formatDate, getInitials, generateAvatarColor, formatFileSize } from '@/lib/utils';
import { Star, Paperclip, Reply, ReplyAll, Forward, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Email {
  id: string;
  from: { email: string; name: string };
  subject: string;
  snippet: string;
  body: string;
  receivedAt: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    contentType: string;
  }>;
  labels: string[];
}

interface EmailListProps {
  emails: Email[];
  expandedEmailId: string | null;
  selectedEmailId: string | null;
  onEmailClick: (id: string) => void;
}

export function EmailList({ emails, expandedEmailId, selectedEmailId, onEmailClick }: EmailListProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Subtle toolbar instead of header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-muted-foreground">Primary</h2>
          <span className="text-xs text-muted-foreground">• {emails.length}</span>
        </div>
        
        {/* Quick filters */}
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            All
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            Unread
          </Button>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-2">
        {emails.map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            isExpanded={expandedEmailId === email.id}
            isSelected={selectedEmailId === email.id}
            onClick={() => onEmailClick(email.id)}
          />
        ))}
        </div>
      </div>
    </div>
  );
}

interface EmailCardProps {
  email: Email;
  isExpanded: boolean;
  isSelected: boolean;
  onClick: () => void;
}

function EmailCard({ email, isExpanded, isSelected, onClick }: EmailCardProps) {
  const avatarColor = generateAvatarColor(email.fromEmail || 'unknown@example.com');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      className={cn(
        'border border-border/50 rounded-lg transition-all bg-card overflow-hidden cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5',
        !email.isRead && 'bg-accent/30',
        isSelected && 'ring-2 ring-primary ring-offset-1'
      )}
    >
      {/* Email Preview - Always Visible */}
      <div
        className={cn(
          'p-4 transition-colors',
          isExpanded && 'bg-accent/50'
        )}
        onClick={onClick}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {getInitials(email.fromName || email.fromEmail || 'Unknown')}
          </div>

          {/* Email Preview Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm truncate', !email.isRead && 'font-semibold')}>
                  {email.fromName || email.fromEmail || 'Unknown'}
                </p>
                <p className={cn('text-sm truncate', !email.isRead ? 'font-medium' : 'text-muted-foreground')}>
                  {email.subject || '(No subject)'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {mounted ? formatDate(email.receivedAt) : ''}
                </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle star toggle
                      }}
                      className="text-muted-foreground hover:text-yellow-500"
                    >
                      <Star
                        className={cn('h-4 w-4', email.isStarred && 'fill-yellow-500 text-yellow-500')}
                      />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {!isExpanded && (
                  <>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {email.snippet}
                    </p>

                    <div className="flex items-center gap-2">
                      {email.hasAttachments && email.attachments && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Paperclip className="h-3.5 w-3.5" />
                          {email.attachments.length}
                        </div>
                      )}
                      {email.labels && email.labels.map((label: string) => (
                        <span
                          key={label}
                          className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

      {/* Expanded Email Content - Dropdown */}
      {isExpanded && (
            <div className="border-t border-border bg-card animate-in slide-in-from-top-2">
              {/* Email Header Details */}
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {getInitials(email.fromName || email.fromEmail || 'Unknown')}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{email.fromName || email.fromEmail || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{email.fromEmail}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(email.receivedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 text-sm px-3">
                      <Reply className="h-3.5 w-3.5 mr-1" />
                      Reply
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-sm px-3">
                      <ReplyAll className="h-3.5 w-3.5 mr-1" />
                      All
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-sm px-3">
                      <Forward className="h-3.5 w-3.5 mr-1" />
                      Forward
                    </Button>
                  </div>
                </div>

                {email.labels && email.labels.length > 0 && (
                  <div className="flex items-center gap-2">
                    {email.labels.map((label: string) => (
                      <span
                        key={label}
                        className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div className="p-5">
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                  <div className="whitespace-pre-wrap">{email.bodyText || email.bodyHtml || email.snippet || '(No content)'}</div>
                </div>

                {/* Attachments */}
                {email.hasAttachments && email.attachments.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-border">
                    <h4 className="text-sm font-medium mb-3">
                      Attachments ({email.attachments.length})
                    </h4>
                    <div className="space-y-2">
                      {email.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-2.5 border border-border rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded bg-muted flex items-center justify-center">
                              {attachment.contentType.includes('pdf') ? (
                                <span className="text-red-500 font-semibold text-xs">PDF</span>
                              ) : attachment.contentType.includes('sheet') ? (
                                <span className="text-green-500 font-semibold text-xs">XLS</span>
                              ) : (
                                <span className="text-blue-500 font-semibold text-xs">FILE</span>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{attachment.filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-3.5 border-t border-border bg-muted/30">
                <div className="flex gap-2">
                  <Button className="flex-1 h-8 text-sm">
                    <Reply className="h-3.5 w-3.5 mr-1.5" />
                    Reply
                  </Button>
                  <Button variant="outline" className="flex-1 h-8 text-sm">
                    <ReplyAll className="h-3.5 w-3.5 mr-1.5" />
                    Reply All
                  </Button>
                  <Button variant="outline" className="flex-1 h-8 text-sm">
                    <Forward className="h-3.5 w-3.5 mr-1.5" />
                    Forward
                  </Button>
                </div>
              </div>
            </div>
      )}
    </div>
  );
}

