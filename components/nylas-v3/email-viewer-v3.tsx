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
      // TODO: Implement archive functionality
      console.log('Archive message:', messageId);
    } catch (err) {
      console.error('Error archiving message:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      await fetch(`/api/nylas-v3/messages/${messageId}?accountId=${accountId}`, {
        method: 'DELETE',
      });

      onClose();
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message');
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
    if (onReplyAll) {
      onReplyAll(messageId);
    }
  };

  const handleForward = () => {
    if (onForward) {
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
      <div className="flex flex-col h-full items-center justify-center bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading message...</p>
      </div>
    );
  }

  if (error || !message) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-card">
        <p className="text-red-600 mb-4">{error || 'Message not found'}</p>
        <Button onClick={onClose}>Close</Button>
      </div>
    );
  }

  const sender = message.from[0];
  const avatarColor = generateAvatarColor(sender.email);
  const senderName = sender.name || sender.email;

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{message.subject || '(No Subject)'}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleStar}
              className={cn(isStarred && 'text-yellow-500')}
            >
              <Star className={cn('h-4 w-4', isStarred && 'fill-yellow-500')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handlePrint} title="Print email">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleArchive}>
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Sender Info */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {getInitials(senderName)}
            </div>
            <div>
              <p className="font-medium">{senderName}</p>
              <p className="text-sm text-muted-foreground">{sender.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(new Date(message.date * 1000))}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReply}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button variant="outline" size="sm" onClick={handleReplyAll}>
              <ReplyAll className="h-4 w-4 mr-2" />
              Reply All
            </Button>
            <Button variant="outline" size="sm" onClick={handleForward}>
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </Button>
            {calendars.length > 0 && selectedCalendar && (
              <Button variant="outline" size="sm" onClick={() => setShowEventDialog(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>
        </div>

        {/* Recipients */}
        {message.to && message.to.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
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
          <div className="mt-1 text-xs text-muted-foreground">
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
      <div className="flex-1 overflow-y-auto p-6 min-h-0">
        {console.log('📤 EmailViewerV3 passing to EmailRendererV3:', { messageId, accountId, attachmentCount: message.attachments?.length || 0 })}
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
            contentType: att.content_type
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
                        alert('Failed to download attachment. Please try again.');
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

      {/* Reply Footer - Fixed */}
      <div className="flex-shrink-0 p-4 border-t border-border">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleReply}>
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleReplyAll}>
            <ReplyAll className="h-4 w-4 mr-2" />
            Reply All
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleForward}>
            <Forward className="h-4 w-4 mr-2" />
            Forward
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
  );
}
