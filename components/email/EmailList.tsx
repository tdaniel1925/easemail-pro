'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { formatDate, getInitials, generateAvatarColor, formatFileSize } from '@/lib/utils';
import { Star, Paperclip, Reply, ReplyAll, Forward, Download, ChevronDown, ChevronUp, Search, Sparkles, Loader2, Trash2, Archive, Mail, MailOpen, FolderInput, CheckSquare, Square, MessageSquare, Tag, Clock, Ban, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useEmailSummary } from '@/lib/hooks/useEmailSummary';
import { ToastContainer, useToast } from '@/components/ui/toast';
import { ThreadSummaryPanel } from '@/components/email/ThreadSummaryPanel';
import { LabelManager } from '@/components/email/LabelManager';
import { LabelPicker } from '@/components/email/LabelPicker';
import { SnoozePicker } from '@/components/email/SnoozePicker';
import DOMPurify from 'isomorphic-dompurify';

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
  threadId?: string | null;
  threadEmailCount?: number | null;
  accountId?: string; // Added for attachment downloads
  folder?: string; // Email folder for AI filtering
}

interface EmailListProps {
  emails: Email[];
  expandedEmailId: string | null;
  selectedEmailId: string | null;
  onEmailClick: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onRefresh?: () => void;
  currentFolder?: string | null;
  onSMSBellClick?: () => void;
}

export function EmailList({ emails, expandedEmailId, selectedEmailId, onEmailClick, searchQuery = '', onSearchChange, onRefresh, currentFolder = null, onSMSBellClick }: EmailListProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const { toasts, closeToast, success, error, info } = useToast();
  
  // AI Summary Toggle
  const [showAISummaries, setShowAISummaries] = useState(true);
  
  // SMS Notifications
  const [unreadSMSCount, setUnreadSMSCount] = useState(0);
  const [showSMSDropdown, setShowSMSDropdown] = useState(false);
  
  // Optimistic updates: track locally removed emails
  const [locallyRemovedEmails, setLocallyRemovedEmails] = useState<Set<string>>(new Set());
  
  // Undo functionality: track last action for undo
  const [undoStack, setUndoStack] = useState<{
    action: string;
    emailIds: string[];
    timestamp: number;
  } | null>(null);

  // Filter out locally removed emails
  const visibleEmails = emails.filter(email => !locallyRemovedEmails.has(email.id));

  // ✅ Auto-clear undo stack after 5 seconds
  useEffect(() => {
    if (!undoStack) return;
    
    const timeElapsed = Date.now() - undoStack.timestamp;
    const timeRemaining = 5000 - timeElapsed;
    
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setUndoStack(null);
      }, timeRemaining);
      
      return () => clearTimeout(timer);
    } else {
      setUndoStack(null);
    }
  }, [undoStack]);
  
  // Load AI Summary preference
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const response = await fetch('/api/user/preferences');
        const data = await response.json();
        if (data.success && data.preferences) {
          setShowAISummaries(data.preferences.showAISummaries ?? true);
        }
      } catch (error) {
        console.error('Failed to load AI summary preference:', error);
      }
    };
    loadPreference();
  }, []);
  
  // Fetch unread SMS count
  useEffect(() => {
    const fetchSMSCount = async () => {
      try {
        const response = await fetch('/api/sms/unread-count');
        const data = await response.json();
        if (data.success) {
          setUnreadSMSCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch SMS count:', error);
      }
    };
    fetchSMSCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSMSCount, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Handle AI Summary toggle change
  const handleAISummaryToggle = async (checked: boolean) => {
    setShowAISummaries(checked);
    
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showAISummaries: checked }),
      });
    } catch (error) {
      console.error('Failed to save preference:', error);
    }
  };
  
  // ✅ Undo handler
  const handleUndo = () => {
    if (!undoStack) return;
    
    // Restore emails from locallyRemovedEmails
    setLocallyRemovedEmails(prev => {
      const next = new Set(prev);
      undoStack.emailIds.forEach(id => next.delete(id));
      return next;
    });
    
    // Clear undo stack
    setUndoStack(null);
  };
  
  // ✅ Label management
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [labelTargetEmails, setLabelTargetEmails] = useState<string[]>([]);
  const [currentLabels, setCurrentLabels] = useState<string[]>([]);
  
  const handleApplyLabels = async (labelIds: string[]) => {
    try {
      const response = await fetch('/api/labels/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: labelTargetEmails,
          labelIds,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh email list to show updated labels
        if (onRefresh) {
          onRefresh();
        }
      } else {
        error(data.error || 'Failed to apply labels');
      }
    } catch (err: any) {
      console.error('Apply labels error:', err);
      error('Failed to apply labels');
    }
  };
  
  const openLabelPickerForBulk = () => {
    const selectedIds = Array.from(selectedEmails);
    setLabelTargetEmails(selectedIds);
    setCurrentLabels([]); // For bulk, we don't pre-select
    setShowLabelPicker(true);
  };
  
  // ✅ Snooze management
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);
  const [snoozeTargetEmails, setSnoozeTargetEmails] = useState<string[]>([]);
  
  const handleSnooze = async (until: Date) => {
    try {
      const response = await fetch('/api/nylas/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds: snoozeTargetEmails,
          action: 'snooze',
          value: until.toISOString(),
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Optimistically remove snoozed emails
        setLocallyRemovedEmails(prev => {
          const next = new Set(prev);
          snoozeTargetEmails.forEach(id => next.add(id));
          return next;
        });
        setSelectedEmails(new Set());
        setSelectMode(false);
        
        if (onRefresh) {
          setTimeout(() => onRefresh(), 500);
        }
      } else {
        error(data.error || 'Failed to snooze emails');
      }
    } catch (err: any) {
      console.error('Snooze error:', err);
      error('Failed to snooze emails');
    }
  };
  
  const openSnoozePickerForBulk = () => {
    const selectedIds = Array.from(selectedEmails);
    setSnoozeTargetEmails(selectedIds);
    setShowSnoozePicker(true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmails.size === visibleEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(visibleEmails.map(e => e.id)));
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

    console.log(`[Bulk] Performing bulk action: ${action} on ${selectedIds.length} emails`);

    // ✅ OPTIMISTIC UPDATE: Remove from UI immediately for delete/archive
    if (action === 'delete' || action === 'archive') {
      setLocallyRemovedEmails(prev => {
        const next = new Set(prev);
        selectedIds.forEach(id => next.add(id));
        return next;
      });
      setSelectedEmails(new Set());
      setSelectMode(false);
      
      // Set undo stack
      setUndoStack({
        action,
        emailIds: selectedIds,
        timestamp: Date.now(),
      });
    }

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
        console.log(`[Bulk] Bulk action successful: ${data.message}`);
        
        // Only show success and refresh for actions that didn't remove items
        if (action !== 'delete' && action !== 'archive') {
          setSelectedEmails(new Set());
          setSelectMode(false);
          
          if (onRefresh) {
            setTimeout(() => {
              onRefresh();
            }, 500);
          }
        }
      } else {
        console.error('Bulk action failed:', data.error);
        error(`Failed: ${data.error || 'Unknown error'}`);
        
        // ❌ REVERT optimistic update on failure
        if (action === 'delete' || action === 'archive') {
          setLocallyRemovedEmails(prev => {
            const next = new Set(prev);
            selectedIds.forEach(id => next.delete(id));
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      error('Failed to perform bulk action. Please try again.');
      
      // ❌ REVERT optimistic update on failure
      if (action === 'delete' || action === 'archive') {
        setLocallyRemovedEmails(prev => {
          const next = new Set(prev);
          selectedIds.forEach(id => next.delete(id));
          return next;
        });
      }
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
              
              <Button
                variant="ghost"
                size="sm"
                onClick={openLabelPickerForBulk}
                title="Apply labels"
                className="h-8"
              >
                <Tag className="h-4 w-4 mr-2" />
                Labels
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={openSnoozePickerForBulk}
                title="Snooze"
                className="h-8"
              >
                <Clock className="h-4 w-4 mr-2" />
                Snooze
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBulkAction('spam')}
                title="Report spam"
                className="h-8"
              >
                <Ban className="h-4 w-4 mr-2" />
                Spam
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
            {/* Folder name - dynamic */}
            <div className="flex-shrink-0">
              <h2 className="text-sm font-medium">{currentFolder || 'Inbox'}</h2>
            </div>

            {/* AI Summary Toggle */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Switch 
                  checked={showAISummaries}
                  onCheckedChange={handleAISummaryToggle}
                />
                <Sparkles className="h-4 w-4" />
                <span className="text-xs">AI</span>
              </label>
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
            
            {/* SMS Notification Bell */}
            <div className="relative flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 relative"
                onClick={() => {
                  setShowSMSDropdown(!showSMSDropdown);
                  if (onSMSBellClick) {
                    onSMSBellClick();
                  }
                }}
              >
                <Bell className="h-4 w-4" />
                {unreadSMSCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {unreadSMSCount > 9 ? '9+' : unreadSMSCount}
                  </span>
                )}
              </Button>
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
        {visibleEmails.map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            isExpanded={expandedEmailId === email.id}
            isSelected={selectedEmailId === email.id}
            isChecked={selectedEmails.has(email.id)}
            selectMode={selectMode}
            showAISummaries={showAISummaries}
            onSelect={(e) => handleSelectEmail(email.id, e)}
            onClick={() => onEmailClick(email.id)}
            showToast={(type, message) => {
              if (type === 'success') success(message);
              else if (type === 'error') error(message);
              else if (type === 'info') info(message);
            }}
            onRemove={(emailId, action) => {
              // Optimistically remove from UI
              setLocallyRemovedEmails(prev => {
                const next = new Set(prev);
                next.add(emailId);
                return next;
              });
              
              // Set undo stack
              setUndoStack({
                action,
                emailIds: [emailId],
                timestamp: Date.now(),
              });
            }}
          />
        ))}
        </div>
      </div>
      
      {/* ✅ Undo Bar */}
      {undoStack && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-foreground text-background px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-sm font-medium">
              {undoStack.emailIds.length} email{undoStack.emailIds.length > 1 ? 's' : ''} {undoStack.action === 'delete' ? 'deleted' : 'archived'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              className="bg-background/10 hover:bg-background/20 text-background h-8"
            >
              Undo
            </Button>
          </div>
        </div>
      )}
      
      {/* ✅ Label Dialogs */}
      <LabelManager
        open={showLabelManager}
        onClose={() => setShowLabelManager(false)}
      />
      <LabelPicker
        open={showLabelPicker}
        onClose={() => setShowLabelPicker(false)}
        currentLabels={currentLabels}
        onApply={handleApplyLabels}
      />
      <SnoozePicker
        open={showSnoozePicker}
        onClose={() => setShowSnoozePicker(false)}
        onSnooze={handleSnooze}
      />
    </div>
  );
}

interface EmailCardProps {
  email: Email;
  isExpanded: boolean;
  isSelected: boolean;
  isChecked: boolean;
  selectMode: boolean;
  showAISummaries: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onClick: () => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  onRemove: (emailId: string, action: 'delete' | 'archive') => void;
}

function EmailCard({ email, isExpanded, isSelected, isChecked, selectMode, showAISummaries, onSelect, onClick, showToast, onRemove }: EmailCardProps) {
  const avatarColor = generateAvatarColor(email.fromEmail || 'unknown@example.com');
  const [mounted, setMounted] = useState(false);
  const [fullEmail, setFullEmail] = useState<Email | null>(null);
  const [loadingFullEmail, setLoadingFullEmail] = useState(false);
  const [showThread, setShowThread] = useState(false);
  
  // Viewport detection
  const { ref, inView } = useInView({
    threshold: 0.5, // Trigger when 50% visible
    triggerOnce: true, // Only trigger once
  });
  
  // Fetch AI summary when in viewport (all folders) AND showAISummaries is enabled
  const shouldFetchSummary = inView && showAISummaries;
  const { data: summaryData, isLoading: isSummaryLoading } = useEmailSummary(email, shouldFetchSummary);

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
  const displayText = (showAISummaries && summaryData?.summary) || email.snippet;
  const hasAISummary = showAISummaries && !!(summaryData && summaryData.summary);
  
  // Action handlers
  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('openCompose', { 
      detail: { type: 'reply', email } 
    }));
  };
  
  const handleReplyAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('openCompose', { 
      detail: { type: 'replyAll', email } 
    }));
  };
  
  const handleForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('openCompose', { 
      detail: { type: 'forward', email } 
    }));
  };
  
  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // ✅ OPTIMISTIC UPDATE: Remove immediately
    onRemove(email.id, 'archive');
    
    try {
      const response = await fetch('/api/nylas/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds: [email.id],
          action: 'archive',
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        showToast('error', 'Failed to archive email');
      }
    } catch (error) {
      console.error('Archive error:', error);
      showToast('error', 'Failed to archive email');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // ✅ OPTIMISTIC UPDATE: Remove immediately
    onRemove(email.id, 'delete');
    
    try {
      const response = await fetch('/api/nylas/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds: [email.id],
          action: 'delete',
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        showToast('error', 'Failed to delete email');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast('error', 'Failed to delete email');
    }
  };
  
  const handleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const action = email.isStarred ? 'unstar' : 'star';
    
    try {
      const response = await fetch('/api/nylas/messages/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds: [email.id],
          action,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Trigger refresh to update star status
        window.dispatchEvent(new CustomEvent('refreshEmails'));
      } else {
        showToast('error', `Failed to ${action} email`);
      }
    } catch (error) {
      console.error(`${action} error:`, error);
      showToast('error', `Failed to ${action} email`);
    }
  };
  
  const handleDownloadAttachment = async (e: React.MouseEvent, attachment: any, emailId: string, accountId?: string) => {
    e.stopPropagation();
    
    if (!accountId) {
      showToast('error', 'No account ID available for download');
      return;
    }

    try {
      console.log('📥 Downloading:', attachment.filename);
      showToast('info', `Downloading ${attachment.filename}...`);

      const response = await fetch(
        `/api/nylas/messages/${emailId}/attachments/${attachment.id}?accountId=${accountId}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Download failed');
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('success', `Downloaded ${attachment.filename}`);
    } catch (error: any) {
      console.error('Download error:', error);
      showToast('error', `Failed to download: ${error.message}`);
    }
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
                {/* Thread Badge */}
                {email.threadId && email.threadEmailCount && email.threadEmailCount > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowThread(!showThread);
                    }}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full transition-all",
                      showThread 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-primary/10 hover:bg-primary/20 text-primary"
                    )}
                    title={`View thread (${email.threadEmailCount} emails)`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {email.threadEmailCount}
                    </span>
                  </button>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {mounted ? formatDate(email.receivedAt) : ''}
                </span>
                <button
                  onClick={handleStar}
                  className="text-muted-foreground hover:text-yellow-500 transition-colors"
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
                {/* AI Summary (3 lines, no subject) */}
                <div className="flex items-start gap-2 pr-2 mb-3">
                  {isSummaryLoading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mt-1 flex-shrink-0" />
                  )}
                  {hasAISummary && !isSummaryLoading && (
                    <Sparkles className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                  )}
                  <p className={cn(
                    'text-sm line-clamp-3 flex-1 leading-relaxed',
                    hasAISummary ? 'text-foreground' : 'text-muted-foreground',
                    !email.isRead && 'font-medium'
                  )}>
                    {displayText}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={handleReply}
                    title="Reply"
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={handleReplyAll}
                    title="Reply All"
                  >
                    <ReplyAll className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    onClick={handleForward}
                    title="Forward"
                  >
                    <Forward className="h-4 w-4" />
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground hover:text-destructive"
                    onClick={handleDelete}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {email.hasAttachments && email.attachments && email.attachments.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {/* Labels */}
                {email.labels && email.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {email.labels.slice(0, 3).map((label, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                      >
                        {label}
                      </span>
                    ))}
                    {email.labels.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs text-muted-foreground">
                        +{email.labels.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Email Content - Dropdown */}
      {isExpanded && (
            <div className="border-t border-border bg-card animate-in slide-in-from-top-2 flex flex-col max-h-[600px]">
              {/* FIXED HEADER: Email Details + Action Buttons */}
              <div className="flex-shrink-0 border-b border-border bg-card">
                {/* Email Header Details with Action Buttons */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    {/* Left side: Avatar + Email Info */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                        style={{ backgroundColor: avatarColor }}
                      >
                        {getInitials(email.fromName || email.fromEmail || 'Unknown')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{email.fromName || email.fromEmail || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground truncate">{email.fromEmail}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(email.receivedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Right side: Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleReply}
                        className="gap-1.5"
                      >
                        <Reply className="h-3.5 w-3.5" />
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReplyAll}
                        className="gap-1.5"
                      >
                        <ReplyAll className="h-3.5 w-3.5" />
                        Reply All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleForward}
                        className="gap-1.5"
                      >
                        <Forward className="h-3.5 w-3.5" />
                        Forward
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleArchive}
                        className="gap-1.5"
                      >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        className="gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Labels */}
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
              </div>

              {/* SCROLLABLE EMAIL BODY */}
              <div className="flex-1 overflow-y-auto p-5">
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
                        dangerouslySetInnerHTML={{ 
                          __html: DOMPurify.sanitize(displayEmail.bodyHtml, {
                            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'img', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
                            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
                            ALLOW_DATA_ATTR: false,
                            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
                          })
                        }}
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7" 
                            onClick={(e) => handleDownloadAttachment(e, attachment, email.id, email.accountId)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
      )}
      
      {/* Thread Summary Panel - Shows when thread badge is clicked */}
      {showThread && email.threadId && (
        <ThreadSummaryPanel
          threadId={email.threadId}
          onEmailClick={(emailId) => {
            // Navigate to that email
            console.log('Navigate to email:', emailId);
            // You can implement navigation here
          }}
          onClose={() => setShowThread(false)}
        />
      )}
    </div>
  );
}

