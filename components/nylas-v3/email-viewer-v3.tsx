/**
 * Email Viewer v3
 * Display email details with Nylas v3 data
 */

'use client';

import { useState, useEffect } from 'react';
import { formatDate, formatFileSize, getInitials, generateAvatarColor } from '@/lib/utils';
import { X, Reply, ReplyAll, Forward, MoreVertical, Download, Star, Archive, Trash2, Loader2, Calendar, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmailTrackingDashboard } from '@/components/email/EmailTrackingDashboard';
import { EventDialog } from '@/components/calendar/EventDialog';
import { printEmail } from '@/lib/utils/print';
import { EmailRendererV3 } from '@/components/email/EmailRendererV3';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';

interface EmailMessage {
  id: string;
  subject: string;
  from: Array<{ email: string; name?: string }>;
  to: Array<{ email: string; name?: string }>;
  cc?: Array<{ email: string; name?: string }>;
  bcc?: Array<{ email: string; name?: string }>;
  date: number;
  body: string;
  snippet: string;
  unread: boolean;
  starred: boolean;
  attachments?: Array<{
    id: string;
    filename: string;
    size: number;
    content_type: string;
    content_id?: string;
  }>;
}

interface EmailViewerV3Props {
  messageId: string;
  accountId: string;
  onClose: () => void;
  onReply?: (messageId: string, from: string, subject: string, body: string) => void;
  onReplyAll?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
}

export function EmailViewerV3({
  messageId,
  accountId,
  onClose,
  onReply,
  onReplyAll,
  onForward,
}: EmailViewerV3Props) {
  const [message, setMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [trackingId, setTrackingId] = useState<string | undefined>();
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string | null>(null);
  const { confirm, Dialog } = useConfirm();
  const { toast } = useToast();

  useEffect(() => {
    fetchMessage();
    fetchCalendars();
  }, [messageId, accountId]);

  const fetchCalendars = async () => {
    try {
      const response = await fetch(`/api/nylas-v3/calendars?accountId=${accountId}`);
      if (response.ok) {
        const data = await response.json();
        setCalendars(data.calendars || []);
        if (data.calendars && data.calendars.length > 0) {
          // Select first calendar by default
          setSelectedCalendar(data.calendars[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching calendars:', err);
    }
  };

  const fetchMessage = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/nylas-v3/messages/${messageId}?accountId=${accountId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch message');
      }

      const data = await response.json();
      setMessage(data.message);
      setIsStarred(data.message.starred || false);
      setTrackingId(data.trackingId);

      // Mark as read if unread
      if (data.message.unread) {
        markAsRead();
      }
    } catch (err) {
      console.error('Error fetching message:', err);
      setError(err instanceof Error ? err.message : 'Failed to load message');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/nylas-v3/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          unread: false,
        }),
      });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const toggleStar = async () => {
    try {
      const newStarred = !isStarred;
      setIsStarred(newStarred);

      await fetch(`/api/nylas-v3/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          starred: newStarred,
        }),
      });
    } catch (err) {
      console.error('Error toggling star:', err);
      setIsStarred(!isStarred); // Revert on error
    }
  };

  const handleArchive = async () => {
    try {
      const response = await fetch(`/api/nylas-v3/messages/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          messageIds: [messageId],
          action: 'archive',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive message');
      }

      toast({
        title: 'Success',
        description: 'Message archived successfully'
      });
      onClose();
    } catch (err) {
      console.error('Error archiving message:', err);
      toast({
        title: 'Error',
        description: 'Failed to archive message',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    try {
      await fetch(`/api/nylas-v3/messages/${messageId}?accountId=${accountId}`, {
        method: 'DELETE',
      });

      toast({ title: 'Success', description: 'Message deleted successfully' });
      onClose();
    } catch (err) {
      console.error('Error deleting message:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      });
    }
  };

  const handleReply = () => {
    if (message && onReply) {
      onReply(
        message.id,
        message.from[0].email,
        message.subject,
        message.body
      );
    }
  };

  const handleReplyAll = () => {
    if (message && onReply) {
      // Get all unique recipients excluding current user
      const allToRecipients = message.to?.map((r: any) => r.email) || [];
      const allCcRecipients = message.cc?.map((r: any) => r.email) || [];
      const sender = message.from[0].email;

      // Combine: Reply goes to sender + all TO recipients + all CC recipients
      const allRecipients = [sender, ...allToRecipients, ...allCcRecipients]
        .filter((e: string, i: number, arr: string[]) => arr.indexOf(e) === i);

      onReply(
        message.id,
        allRecipients.join(', '),
        message.subject,
        message.body
      );
    } else if (onReplyAll) {
      onReplyAll(messageId);
    }
  };

  const handleForward = () => {
    if (message && onReply) {
      // Use onReply handler with forward prefix
      const forwardSubject = message.subject?.startsWith('Fwd:')
        ? message.subject
        : `Fwd: ${message.subject}`;

      onReply(
        message.id,
        '', // Empty 'to' field for forward
        forwardSubject,
        message.body
      );
    } else if (onForward) {
      onForward(messageId);
    }
  };

  const handlePrint = () => {
    if (!message) return;

    printEmail({
      subject: message.subject || '(No Subject)',
      from: {
        name: message.from[0].name || message.from[0].email,
        email: message.from[0].email,
      },
      to: message.to,
      cc: message.cc,
      date: new Date(message.date),
      body: message.body,
      attachments: message.attachments?.map(att => ({
        filename: att.filename,
        size: att.size,
      })),
      includeHeaders: true,
      includeAttachments: true,
    });
  };

  if (loading) {
    return (
      <>
        <Dialog />
        <div className="flex flex-col h-full items-center justify-center bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">Loading message...</p>
        </div>
      </>
    );
  }

  if (error || !message) {
    return (
      <>
        <Dialog />
        <div className="flex flex-col h-full items-center justify-center bg-card">
          <p className="text-red-600 mb-4">{error || 'Message not found'}</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </>
    );
  }

  const sender = message.from[0];
  const avatarColor = generateAvatarColor(sender.email);
  const senderName = sender.name || sender.email;

  return (
    <>
      <Dialog />
      <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 px-2 py-1.5 border-b border-border">
        <div className="flex items-center justify-between gap-1.5">
          <h2 className="text-[11px] font-semibold flex-1 truncate">{message.subject || '(No Subject)'}</h2>
          <div className="flex items-center gap-0 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleStar}
              className={cn('h-5 w-5', isStarred && 'text-yellow-500')}
            >
              <Star className={cn('h-3 w-3', isStarred && 'fill-yellow-500')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePrint} title="Print email" className="hidden sm:flex h-5 w-5">
              <Printer className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleArchive} className="hidden sm:flex h-5 w-5">
              <Archive className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} className="h-5 w-5">
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-5 w-5">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Sender Info */}
        <div className="flex items-center justify-between gap-1.5 mt-1">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-medium text-white flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {getInitials(senderName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium truncate">{senderName}</span>
                <span className="text-[9px] text-muted-foreground truncate hidden sm:inline">{sender.email}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">
                {formatDate(new Date(message.date * 1000))}
              </p>
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex gap-0.5 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleReply} className="h-5 px-1.5 text-[9px]">
              <Reply className="h-2.5 w-2.5 mr-0.5" />
              Reply
            </Button>
            <Button variant="outline" size="sm" onClick={handleReplyAll} className="h-5 px-1.5 text-[9px]">
              <ReplyAll className="h-2.5 w-2.5 mr-0.5" />
              All
            </Button>
            <Button variant="outline" size="sm" onClick={handleForward} className="h-5 px-1.5 text-[9px]">
              <Forward className="h-2.5 w-2.5 mr-0.5" />
              Fwd
            </Button>
            {calendars.length > 0 && selectedCalendar && (
              <Button variant="outline" size="sm" onClick={() => setShowEventDialog(true)} className="h-5 px-1.5 text-[9px]">
                <Calendar className="h-2.5 w-2.5 mr-0.5" />
                Event
              </Button>
            )}
          </div>
        </div>

        {/* Recipients */}
        {message.to && message.to.length > 0 && (
          <div className="mt-1 text-[9px] text-muted-foreground truncate">
            <span className="font-medium">To: </span>
            {message.to.map((r, i) => (
              <span key={i}>
                {r.name || r.email}
                {i < message.to.length - 1 && ', '}
              </span>
            ))}
          </div>
        )}

        {message.cc && message.cc.length > 0 && (
          <div className="text-[9px] text-muted-foreground truncate">
            <span className="font-medium">Cc: </span>
            {message.cc.map((r, i) => (
              <span key={i}>
                {r.name || r.email}
                {i < (message.cc?.length || 0) - 1 && ', '}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Email Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        <EmailRendererV3
          emailId={messageId}
          messageId={messageId}
          accountId={accountId}
          bodyHtml={message.body}
          bodyText={message.snippet}
          attachments={message.attachments?.map(att => ({
            id: att.id,
            filename: att.filename,
            size: att.size,
            contentType: att.content_type,
            contentId: att.content_id
          })) || null}
        />

        {/* Attachments - Kept for backward compatibility but EmailRendererV3 will handle them */}
        {false && (message?.attachments?.length ?? 0) > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-medium mb-3">
              Attachments ({message?.attachments?.length})
            </h3>
            <div className="space-y-2">
              {message?.attachments?.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      {attachment.content_type.includes('pdf') ? (
                        <span className="text-red-500 font-semibold text-xs">PDF</span>
                      ) : attachment.content_type.includes('sheet') ? (
                        <span className="text-green-500 font-semibold text-xs">XLS</span>
                      ) : attachment.content_type.includes('image') ? (
                        <span className="text-blue-500 font-semibold text-xs">IMG</span>
                      ) : (
                        <span className="text-gray-500 font-semibold text-xs">FILE</span>
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
                    onClick={async () => {
                      try {
                        // Download attachment via v3 API with query parameters
                        const params = new URLSearchParams({
                          accountId: accountId,
                          messageId: message?.id || '',
                          attachmentId: attachment.id,
                        });
                        const response = await fetch(
                          `/api/nylas-v3/messages/download/attachment?${params.toString()}`
                        );

                        if (!response.ok) {
                          throw new Error('Failed to download attachment');
                        }

                        // Get the blob from the response
                        const blob = await response.blob();

                        // Create a download link and trigger it
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = attachment.filename || 'download';
                        document.body.appendChild(a);
                        a.click();

                        // Clean up
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (error) {
                        console.error('Error downloading attachment:', error);
                        toast({
                          title: 'Error',
                          description: 'Failed to download attachment. Please try again.',
                          variant: 'destructive'
                        });
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Tracking Dashboard */}
        {trackingId && (
          <div className="mt-6 pt-6 border-t border-border">
            <EmailTrackingDashboard trackingId={trackingId} />
          </div>
        )}
      </div>

      {/* Reply Footer - Fixed - Visible on mobile, hidden on desktop (desktop has top buttons) */}
      <div className="flex-shrink-0 px-2 py-1 md:hidden border-t border-border">
        <div className="flex gap-0.5">
          <Button className="flex-1 h-6 text-[10px]" onClick={handleReply}>
            <Reply className="h-2.5 w-2.5 mr-0.5" />
            Reply
          </Button>
          <Button variant="outline" className="flex-1 h-6 text-[10px]" onClick={handleReplyAll}>
            <ReplyAll className="h-2.5 w-2.5 mr-0.5" />
            All
          </Button>
          <Button variant="outline" className="flex-1 h-6 text-[10px]" onClick={handleForward}>
            <Forward className="h-2.5 w-2.5 mr-0.5" />
            Fwd
          </Button>
        </div>
      </div>

      {/* Event Dialog */}
      {showEventDialog && selectedCalendar && (
        <EventDialog
          accountId={accountId}
          calendarId={selectedCalendar}
          onClose={() => setShowEventDialog(false)}
          onSave={() => {
            setShowEventDialog(false);
          }}
        />
      )}
    </div>
    </>
  );
}
