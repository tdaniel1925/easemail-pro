'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { formatDate, getInitials, generateAvatarColor, formatFileSize } from '@/lib/utils';
import { Star, Paperclip, Reply, ReplyAll, Forward, Download, ChevronDown, ChevronUp, Search, Sparkles, Loader2, Trash2, Archive, Mail, MailOpen, FolderInput, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useEmailSummary } from '@/lib/hooks/useEmailSummary';
import { ToastContainer, useToast } from '@/components/ui/toast';

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
  onRefresh?: () => void;
}

export function EmailList({ emails, expandedEmailId, selectedEmailId, onEmailClick, searchQuery = '', onSearchChange, onRefresh }: EmailListProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const { toasts, closeToast, success, error, info } = useToast();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const handleSelectEmail = (emailId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
    if (newSelected.size === 0) {
      setSelectMode(false);
    } else {
      setSelectMode(true);
    }
  };

  const handleBulkAction = async (action: string) => {
    const selectedIds = Array.from(selectedEmails);
    
    if (selectedIds.length === 0) {
      return;
    }

    console.log(`📦 Performing bulk action: ${action} on ${selectedIds.length} emails`);
    info(`Processing ${selectedIds.length} emails...`);

    try {
      const response = await fetch('/api/nylas/messages/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds: selectedIds,
          action,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Bulk action successful: ${data.message}`);
        success(data.message);
        
        // Clear selection
        setSelectedEmails(new Set());
        setSelectMode(false);
        
        // Refresh the email list without full page reload
        if (onRefresh) {
          setTimeout(() => {
            onRefresh();
          }, 500);
        }
      } else {
        console.error('Bulk action failed:', data.error);
        error(`Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      error('Failed to perform bulk action. Please try again.');
    }
  };

  const allSelected = emails.length > 0 && selectedEmails.size === emails.length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={closeToast} />
      
      {/* Toolbar - switches between normal and bulk actions */}
      <div className="h-14 px-4 border-b border-border/50 flex items-center">
        {selectMode ? (
          /* Bulk Actions Toolbar */
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-8"
            >
              {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </Button>
            
            <span className="text-sm font-medium">
              {selectedEmails.size} selected
            </span>

            <div className="h-6 w-px bg-border mx-2" />

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                title="Delete"
                className="h-8"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('archive')}
                title="Archive"
                className="h-8"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('markRead')}
                title="Mark as read"
                className="h-8"
              >
                <MailOpen className="h-4 w-4 mr-2" />
                Read
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('markUnread')}
                title="Mark as unread"
                className="h-8"
              >
                <Mail className="h-4 w-4 mr-2" />
                Unread
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('move')}
                title="Move to folder"
                className="h-8"
              >
                <FolderInput className="h-4 w-4 mr-2" />
                Move
              </Button>
            </div>

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedEmails(new Set());
                setSelectMode(false);
              }}
              className="h-8"
            >
              Cancel
            </Button>
          </div>
        ) : (
          /* Normal Toolbar */
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
        )}
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
            isChecked={selectedEmails.has(email.id)}
            selectMode={selectMode}
            onSelect={(e) => handleSelectEmail(email.id, e)}
            onClick={() => onEmailClick(email.id)}
            showToast={(type, message) => {
              if (type === 'success') success(message);
              else if (type === 'error') error(message);
              else if (type === 'info') info(message);
            }}
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
  isChecked: boolean;
  selectMode: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

function EmailCard({ email, isExpanded, isSelected, isChecked, selectMode, onSelect, onClick, showToast }: EmailCardProps) {
  const avatarColor = generateAvatarColor(email.fromEmail || 'unknown@example.com');
  const [mounted, setMounted] = useState(false);
  const [fullEmail, setFullEmail] = useState<Email | null>(null);
  const [loadingFullEmail, setLoadingFullEmail] = useState(false);
  
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
  
  // Fetch full email body when expanded
  useEffect(() => {
    if (isExpanded && !fullEmail && !email.bodyHtml && !email.bodyText) {
      const fetchFullEmail = async () => {
        setLoadingFullEmail(true);
        try {
          const response = await fetch(`/api/nylas/messages/${email.id}`);
          const data = await response.json();
          if (data.success && data.message) {
            setFullEmail(data.message);
          }
        } catch (error) {
          console.error('Failed to fetch full email:', error);
        } finally {
          setLoadingFullEmail(false);
        }
      };
      fetchFullEmail();
    }
  }, [isExpanded, email.id, email.bodyHtml, email.bodyText, fullEmail]);
  
  // Use full email data if available
  const displayEmail = fullEmail || email;
  
  // Use AI summary if available, otherwise use snippet
  const displayText = summaryData?.summary || email.snippet;
  const hasAISummary = !!(summaryData && summaryData.summary);
  
  // Action handlers
  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Reply to:', email.fromEmail);
    showToast('info', `Reply to: ${email.fromEmail} - Subject: Re: ${email.subject}`);
    // TODO: Open compose modal with reply data
  };
  
  const handleReplyAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Reply all to:', email.fromEmail);
    showToast('info', `Reply All to: ${email.fromEmail} - Subject: Re: ${email.subject}`);
    // TODO: Open compose modal with reply all data
  };
  
  const handleForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Forward:', email.subject);
    showToast('info', `Forward email - Subject: Fwd: ${email.subject}`);
    // TODO: Open compose modal with forward data
  };
  
  const handleDownloadAttachment = (e: React.MouseEvent, attachment: any) => {
    e.stopPropagation();
    console.log('Download:', attachment.filename);
    showToast('success', `Downloading: ${attachment.filename}`);
    // TODO: Implement actual download
  };

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
          {/* Checkbox - always visible for easy selection */}
          <div 
            className="flex items-start pt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(e);
            }}
          >
            <button
              className={cn(
                "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                isChecked 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "border-border hover:border-primary/50 bg-background"
              )}
            >
              {isChecked && <CheckSquare className="h-4 w-4" />}
            </button>
          </div>

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
                <div className="flex items-start gap-2 pr-2">
                  {isSummaryLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mt-1 flex-shrink-0" />
                  )}
                  {hasAISummary && !isSummaryLoading && (
                    <Sparkles className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                  )}
                  <p className={cn(
                    'text-sm line-clamp-2 flex-1 leading-relaxed',
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
                {loadingFullEmail ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading full email...</span>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm break-words overflow-wrap-anywhere">
                    {displayEmail.bodyHtml ? (
                      <div 
                        className="email-content break-words"
                        dangerouslySetInnerHTML={{ __html: displayEmail.bodyHtml }}
                      />
                    ) : displayEmail.bodyText ? (
                      <div className="whitespace-pre-wrap break-words">{displayEmail.bodyText}</div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{displayEmail.snippet || '(No content)'}</div>
                    )}
                  </div>
                )}

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
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => handleDownloadAttachment(e, attachment)}>
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
                  <Button className="flex-1 h-8 text-sm" onClick={handleReply}>
                    <Reply className="h-3.5 w-3.5 mr-1.5" />
                    Reply
                  </Button>
                  <Button variant="outline" className="flex-1 h-8 text-sm" onClick={handleReplyAll}>
                    <ReplyAll className="h-3.5 w-3.5 mr-1.5" />
                    Reply All
                  </Button>
                  <Button variant="outline" className="flex-1 h-8 text-sm" onClick={handleForward}>
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

