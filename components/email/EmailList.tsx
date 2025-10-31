'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { formatDate, getInitials, generateAvatarColor, formatFileSize } from '@/lib/utils';
import { Star, Paperclip, Reply, ReplyAll, Forward, Download, ChevronDown, ChevronUp, Search, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useEmailSummary } from '@/lib/hooks/useEmailSummary';

interface Email {
  id: string;
  fromEmail?: string;
  fromName?: string;
  subject: string;
  snippet: string;
  body?: string;
  bodyText?: string;
  bodyHtml?: string;
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
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function EmailList({ emails, expandedEmailId, selectedEmailId, onEmailClick, searchQuery = '', onSearchChange }: EmailListProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Single row toolbar - everything inline */}
      <div className="h-14 px-4 border-b border-border/50 flex items-center">
        <div className="flex items-center gap-4 w-full">
          {/* Folder name only */}
          <div className="flex-shrink-0">
            <h2 className="text-sm font-medium">Primary</h2>
          </div>

          {/* Search bar - takes remaining space */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search emails... (Ctrl+K)"
              className="w-full pl-10 pr-3 h-9 bg-background border-border"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          
          {/* Quick filters - right aligned */}
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="sm" className="h-9 px-3 text-sm">
              All
            </Button>
            <Button variant="ghost" size="sm" className="h-9 px-3 text-sm">
              Unread
            </Button>
          </div>
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
  
  // Viewport detection
  const { ref, inView } = useInView({
    threshold: 0.5, // Trigger when 50% visible
    triggerOnce: true, // Only trigger once
  });
  
  // Fetch AI summary when in viewport
  const { data: summaryData, isLoading: isSummaryLoading } = useEmailSummary(email, inView);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use AI summary if available, otherwise use snippet
  const displayText = summaryData?.summary || email.snippet;
  const hasAISummary = !!summaryData?.summary;

  return (
    <div
      ref={ref}
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
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', !email.isRead && 'font-semibold')}>
                  {email.fromName || email.fromEmail || 'Unknown'}
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
                <p className={cn('text-sm mb-1', !email.isRead ? 'font-medium' : 'text-muted-foreground')}>
                  {email.subject || '(No subject)'}
                </p>
                
                {/* AI Summary or Snippet */}
                <div className="flex items-start gap-2">
                  {isSummaryLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mt-1 flex-shrink-0" />
                  )}
                  {hasAISummary && !isSummaryLoading && (
                    <Sparkles className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                  )}
                  <p className={cn(
                    'text-sm line-clamp-2 flex-1',
                    hasAISummary ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}>
                    {displayText}
                  </p>
                </div>

                {email.hasAttachments && email.attachments && email.attachments.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}</span>
                  </div>
                )}
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
                  {email.bodyHtml ? (
                    <div 
                      className="email-content"
                      dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                    />
                  ) : email.bodyText ? (
                    <div className="whitespace-pre-wrap">{email.bodyText}</div>
                  ) : (
                    <div className="whitespace-pre-wrap">{email.snippet || '(No content)'}</div>
                  )}
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

