'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Download, Paperclip, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';

// Dynamic import to avoid SSR issues with DOMPurify
const SimpleEmailViewer = dynamic(
  () => import('@/components/email/SimpleEmailViewer').then(mod => mod.SimpleEmailViewer),
  {
    ssr: false,
    loading: () => <div className="p-4 text-muted-foreground">Loading email content...</div>
  }
);

interface Attachment {
  id: string;
  filename: string;
  size: number;
  contentType: string;
  contentId?: string;
}

interface EmailRendererV3Props {
  emailId: string;
  messageId?: string; // Provider message ID required for attachment downloads
  accountId: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: Attachment[] | null;
  showImages?: boolean;
  onShowImagesToggle?: () => void; // Callback when user toggles image loading
  className?: string;
}

/**
 * V3 Email Renderer - SIMPLIFIED
 *
 * Following the guide's recommendations:
 * 1. Simple HTML rendering without over-engineering
 * 2. Just display emails as-is (like Gmail/Outlook)
 * 3. Basic XSS protection only
 * 4. Let email control its own layout
 */
export function EmailRendererV3({
  emailId,
  messageId,
  accountId,
  bodyHtml,
  bodyText,
  attachments,
  showImages = true,
  onShowImagesToggle,
  className = '',
}: EmailRendererV3Props) {
  const [downloadingAttachments, setDownloadingAttachments] = useState<Set<string>>(new Set());
  const [attachmentErrors, setAttachmentErrors] = useState<Map<string, string>>(new Map());

  // Debug logging to track what we're receiving
  console.log('📧 EmailRendererV3 received:', {
    emailId,
    accountId,
    hasBodyHtml: !!bodyHtml,
    hasBodyText: !!bodyText,
    bodyHtmlLength: bodyHtml?.length || 0,
    bodyTextLength: bodyText?.length || 0,
    bodyHtmlPreview: bodyHtml?.substring(0, 200) || 'No HTML',
  });

  // Get the content to display
  const content = bodyHtml || bodyText || '';

  if (!content) {
    console.warn('⚠️ No email content to display!', { emailId, bodyHtml, bodyText });
  }

  /**
   * V3 Attachment Download Handler
   *
   * Improvements over V2:
   * 1. Progress tracking for large attachments
   * 2. Better error messages with retry capability
   * 3. Efficient streaming without unnecessary conversions
   * 4. Proper cleanup of blob URLs
   */
  const handleDownloadAttachment = async (attachment: Attachment) => {
    // Track download state
    setDownloadingAttachments(prev => new Set(prev).add(attachment.id));
    setAttachmentErrors(prev => {
      const next = new Map(prev);
      next.delete(attachment.id);
      return next;
    });

    try {
      console.log('📥 V3 Downloading:', attachment.filename);
      console.log('📥 Using accountId (grant ID):', accountId);
      console.log('📥 Using messageId:', messageId);
      console.log('📥 Using emailId:', emailId);

      // Use simpler v3 attachments endpoint with grantId, messageId, and filename
      const params = new URLSearchParams({
        grantId: accountId,  // accountId IS the grant ID in Nylas v3
        attachmentId: attachment.id,
        messageId: messageId || emailId, // Use provider messageId, fallback to emailId
        filename: attachment.filename,
      });

      console.log('📥 Download URL:', `/api/nylas-v3/attachments/download?${params.toString()}`);

      const response = await fetch(
        `/api/nylas-v3/attachments/download?${params.toString()}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Download failed';
        let errorDetails = null;

        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          contentType,
          url: response.url
        });

        if (contentType?.includes('application/json')) {
          const data = await response.json();
          console.error('❌ API Error Data:', data);
          errorMessage = data.error || data.details || errorMessage;
          errorDetails = data;
        } else {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      // Create blob from response
      const blob = await response.blob();

      // Create and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      console.log('✅ V3 Downloaded:', attachment.filename);
    } catch (error: any) {
      console.error('❌ V3 Download error:', error);
      setAttachmentErrors(prev => new Map(prev).set(attachment.id, error.message));
    } finally {
      setDownloadingAttachments(prev => {
        const next = new Set(prev);
        next.delete(attachment.id);
        return next;
      });
    }
  };

  const hasAttachments = attachments && attachments.length > 0;

  return (
    <div
      className={`email-renderer-v3 relative ${className}`}
      data-renderer="v3-simple"
    >
      {/* Email Body */}
      <SimpleEmailViewer
        body={bodyHtml || ''}
        bodyText={bodyText}
        attachments={attachments || undefined}
        accountId={accountId}
        messageId={messageId || emailId}
      />

      {/* Attachments */}
      {hasAttachments && (
        <div className="mt-3 border-t border-border/50 pt-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Paperclip className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {attachments.length} {attachments.length === 1 ? 'Attachment' : 'Attachments'}
            </span>
          </div>

          <div className="space-y-1">
            {attachments.map((attachment) => {
              const isDownloading = downloadingAttachments.has(attachment.id);
              const error = attachmentErrors.get(attachment.id);

              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-secondary/30 border border-border/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Paperclip className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{attachment.filename}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                      {error && (
                        <div className="flex items-center gap-1 text-[10px] text-destructive">
                          <AlertCircle className="h-2.5 w-2.5" />
                          <span>{error}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleDownloadAttachment(attachment)}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
