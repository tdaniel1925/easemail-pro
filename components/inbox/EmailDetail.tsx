'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import AttachmentItem from './AttachmentItem';
import DOMPurify from 'isomorphic-dompurify';
import {
  X,
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  Star,
  MoreVertical,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Email {
  id: string;
  subject: string | null;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: Array<{ email: string; name?: string }> | null;
  ccEmails?: Array<{ email: string; name?: string }> | null;
  bccEmails?: Array<{ email: string; name?: string }> | null;
  receivedAt: Date | string;
  isStarred: boolean | null;
  hasAttachments: boolean | null;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    contentType: string;
    contentId?: string;
    url?: string;
    providerFileId?: string;
  }> | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
}

interface EmailDetailProps {
  email: Email;
  accountId: string;
  onClose: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onStar: () => void;
  thread?: Email[];
}

export default function EmailDetail({
  email,
  accountId,
  onClose,
  onDelete,
  onArchive,
  onStar,
  thread = [email],
}: EmailDetailProps) {
  const [showImages, setShowImages] = useState(true);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(
    new Set([email.id])
  );
  const [isComposing, setIsComposing] = useState(false);
  const [meetingResponse, setMeetingResponse] = useState<'accepted' | 'declined' | 'tentative' | null>(null);

  const formatDate = (date: Date | string) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return format(d, 'PPpp');
    } catch {
      return '';
    }
  };

  const formatRecipients = (
    recipients: Array<{ email: string; name?: string }> | null
  ) => {
    if (!recipients || recipients.length === 0) return '';
    return recipients
      .map(r => r.name || r.email)
      .join(', ');
  };

  const sanitizeHtml = (html: string | null) => {
    if (!html) return '';

    // Sanitize HTML to prevent XSS
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody',
        'tr', 'td', 'th', 'div', 'span', 'pre', 'code',
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target'],
      ALLOW_DATA_ATTR: false,
    });

    // Block external images by default unless showImages is true
    if (!showImages) {
      return clean.replace(
        /<img[^>]*src=["']([^"']*)["'][^>]*>/gi,
        (match, src) => {
          // Check if it's a data URL (inline image) or external
          if (src.startsWith('data:')) {
            return match; // Allow inline images
          }
          // Replace with placeholder
          return `<div class="blocked-image" style="background: #f3f4f6; border: 2px dashed #d1d5db; padding: 20px; text-align: center; margin: 10px 0; border-radius: 8px;">
            <svg class="inline-block w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p style="color: #6b7280; font-size: 14px;">Image blocked for your privacy</p>
          </div>`;
        }
      );
    }

    return clean;
  };

  const hasExternalImages = (html: string | null | undefined) => {
    if (!html) return false;
    const imgRegex = /<img[^>]*src=["']([^"']*)["'][^>]*>/gi;
    const matches = html.match(imgRegex);
    if (!matches) return false;

    return matches.some(match => {
      const srcMatch = match.match(/src=["']([^"']*)["']/);
      if (!srcMatch) return false;
      const src = srcMatch[1];
      return !src.startsWith('data:') && !src.startsWith('cid:');
    });
  };

  const toggleEmailExpanded = (emailId: string) => {
    setExpandedEmails(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const downloadAttachment = async (attachment: any) => {
    try {
      const params = new URLSearchParams({
        accountId: accountId,
        messageId: email.id,
        attachmentId: attachment.id,
      });
      const response = await fetch(
        `/api/nylas-v3/messages/download/attachment?${params.toString()}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  // ✅ OUTLOOK BEHAVIOR: Detect .ics calendar invitations
  const hasMeetingInvitation = (threadEmail: Email) => {
    if (!threadEmail.hasAttachments || !threadEmail.attachments) return false;
    return threadEmail.attachments.some(
      att => att.filename.toLowerCase().endsWith('.ics') ||
             att.contentType?.toLowerCase().includes('calendar')
    );
  };

  // ✅ OUTLOOK BEHAVIOR: Handle meeting invitation response
  const handleMeetingResponse = async (response: 'accepted' | 'declined' | 'tentative') => {
    try {
      setMeetingResponse(response);

      // Find the .ics attachment
      const icsAttachment = email.attachments?.find(
        att => att.filename.toLowerCase().endsWith('.ics') ||
               att.contentType?.toLowerCase().includes('calendar')
      );

      if (!icsAttachment) {
        console.error('No .ics attachment found');
        return;
      }

      console.log(`Meeting response: ${response}`, icsAttachment);

      // Download the .ics file
      const params = new URLSearchParams({
        accountId: accountId,
        messageId: email.id,
        attachmentId: icsAttachment.id,
      });

      const downloadResponse = await fetch(
        `/api/nylas-v3/messages/download/attachment?${params.toString()}`
      );

      if (!downloadResponse.ok) {
        throw new Error('Failed to download ICS attachment');
      }

      const icsBlob = await downloadResponse.blob();
      const icsText = await icsBlob.text();

      // Parse the ICS file and create calendar event
      const parseResponse = await fetch('/api/calendar/parse-ics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          icsData: icsText,
          accountId: accountId,
          messageId: email.id,
          response: response,
        }),
      });

      const parseData = await parseResponse.json();

      if (parseData.success) {
        console.log('Meeting invitation processed:', parseData);

        // Show success message
        if (response === 'accepted' && parseData.calendarEventId) {
          console.log('Event added to calendar:', parseData.calendarEventId);
        }
      } else {
        console.error('Failed to process meeting invitation:', parseData.error);
        setMeetingResponse(null);
      }

    } catch (error) {
      console.error('Error responding to meeting invitation:', error);
      setMeetingResponse(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 max-w-4xl">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex-1 mr-4">
            {email.subject || '(No subject)'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Reply className="h-4 w-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" size="sm">
            <ReplyAll className="h-4 w-4 mr-2" />
            Reply All
          </Button>
          <Button variant="outline" size="sm">
            <Forward className="h-4 w-4 mr-2" />
            Forward
          </Button>

          <div className="flex-1" />

          <Button
            variant="outline"
            size="icon"
            onClick={onStar}
            title={email.isStarred ? 'Unstar' : 'Star'}
          >
            <Star
              className={
                email.isStarred
                  ? 'h-4 w-4 fill-yellow-400 text-yellow-400'
                  : 'h-4 w-4'
              }
            />
          </Button>
          <Button variant="outline" size="icon" onClick={onArchive}>
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Move to folder</DropdownMenuItem>
              <DropdownMenuItem>Print</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Email Thread */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-4">
          {thread.map((threadEmail, index) => {
            const isExpanded = expandedEmails.has(threadEmail.id);
            const isLast = index === thread.length - 1;

            return (
              <div
                key={threadEmail.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Email Header */}
                <div
                  className="p-4 bg-gray-50 dark:bg-gray-900/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900"
                  onClick={() => !isLast && toggleEmailExpanded(threadEmail.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {(threadEmail.fromName || threadEmail.fromEmail || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {threadEmail.fromName || threadEmail.fromEmail}
                        </p>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(threadEmail.receivedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        to {formatRecipients(threadEmail.toEmails)}
                      </p>
                      {threadEmail.ccEmails && threadEmail.ccEmails.length > 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          cc {formatRecipients(threadEmail.ccEmails)}
                        </p>
                      )}
                    </div>

                    {!isLast && (
                      <Button variant="ghost" size="icon">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Email Body */}
                {(isLast || isExpanded) && (
                  <div className="p-4">
                    {/* Show Images Alert */}
                    {hasExternalImages(threadEmail.bodyHtml) && !showImages && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                          <span className="text-sm text-yellow-800 dark:text-yellow-300">
                            Images are blocked for your privacy
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowImages(true)}
                        >
                          <ImageIcon className="h-4 w-4 mr-2" />
                          Show Images
                        </Button>
                      </div>
                    )}

                    {/* Body Content */}
                    <div
                      className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(threadEmail.bodyHtml ?? threadEmail.bodyText ?? ''),
                      }}
                    />

                    {/* ✅ OUTLOOK BEHAVIOR: Meeting Invitation Response */}
                    {hasMeetingInvitation(threadEmail) && (
                      <div className="mt-6 mb-6">
                        <Separator className="mb-4" />
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Meeting Invitation
                            </h4>
                          </div>

                          {meetingResponse ? (
                            <div className="flex items-center gap-2 text-sm">
                              {meetingResponse === 'accepted' && (
                                <>
                                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  <span className="text-green-800 dark:text-green-300 font-medium">
                                    You accepted this invitation
                                  </span>
                                </>
                              )}
                              {meetingResponse === 'declined' && (
                                <>
                                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                  <span className="text-red-800 dark:text-red-300 font-medium">
                                    You declined this invitation
                                  </span>
                                </>
                              )}
                              {meetingResponse === 'tentative' && (
                                <>
                                  <HelpCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                  <span className="text-yellow-800 dark:text-yellow-300 font-medium">
                                    You responded as tentative
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                                How do you want to respond to this meeting invitation?
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleMeetingResponse('accepted')}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-yellow-600 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                  onClick={() => handleMeetingResponse('tentative')}
                                >
                                  <HelpCircle className="h-4 w-4 mr-2" />
                                  Tentative
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-600 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => handleMeetingResponse('declined')}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Decline
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {threadEmail.hasAttachments &&
                      threadEmail.attachments &&
                      threadEmail.attachments.length > 0 && (
                        <div className="mt-6">
                          <Separator className="mb-4" />
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Attachments ({threadEmail.attachments.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {threadEmail.attachments.map(attachment => (
                              <AttachmentItem
                                key={attachment.id}
                                attachment={attachment}
                                emailId={threadEmail.id}
                                accountId={accountId}
                                onDownload={() => downloadAttachment(attachment)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
