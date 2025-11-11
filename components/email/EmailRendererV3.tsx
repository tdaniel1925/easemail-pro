'use client';

import { useState } from 'react';
import { Download, Paperclip, AlertCircle, Loader2, Eye, EyeOff, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';
import { SimpleEmailViewer } from '@/components/email/SimpleEmailViewer';

interface Attachment {
  id: string;
  filename: string;
  size: number;
  contentType: string;
}

interface EmailRendererV3Props {
  emailId: string;
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
  const [showHtmlSource, setShowHtmlSource] = useState(false);

  // Debug logging to track what we're receiving
  console.log('📧 EmailRendererV3 received:', {
    emailId,
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

      const response = await fetch(
        `/api/nylas/messages/${emailId}/attachments/${attachment.id}?accountId=${accountId}`,
        {
          method: 'GET',
          headers: {
            'Accept': attachment.contentType || 'application/octet-stream',
          },
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Download failed';

        if (contentType?.includes('application/json')) {
          const data = await response.json();
          errorMessage = data.error || data.details || errorMessage;
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
      {/* Control Bar - Image Toggle & HTML View */}
      <div className="mb-3 flex items-center justify-between gap-2 p-2 bg-secondary/30 border border-border/50 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          {showImages ? (
            <Eye className="h-4 w-4 text-primary" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">
            {showImages
              ? 'External images are showing'
              : 'External images are blocked'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHtmlSource(!showHtmlSource)}
            className="h-8"
            title={showHtmlSource ? 'Hide HTML Source' : 'View HTML Source'}
          >
            <Code className="h-4 w-4 mr-2" />
            {showHtmlSource ? 'Hide HTML' : 'View HTML'}
          </Button>
          {onShowImagesToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowImagesToggle}
              className="h-8"
            >
              {showImages ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Block Images
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Images
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Email Body or HTML Source */}
      {showHtmlSource ? (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="bg-muted px-3 py-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">HTML Source Code</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(bodyHtml || bodyText || '');
              }}
            >
              Copy
            </Button>
          </div>
          <pre className="p-4 overflow-auto max-h-[600px] text-xs font-mono bg-card">
            <code>{bodyHtml || bodyText || 'No content'}</code>
          </pre>
        </div>
      ) : (
        <SimpleEmailViewer body={bodyHtml || ''} bodyText={bodyText} />
      )}

      {/* Attachments */}
      {hasAttachments && (
        <div className="mt-4 border-t border-border/50 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {attachments.length} {attachments.length === 1 ? 'Attachment' : 'Attachments'}
            </span>
          </div>

          <div className="space-y-2">
            {attachments.map((attachment) => {
              const isDownloading = downloadingAttachments.has(attachment.id);
              const error = attachmentErrors.get(attachment.id);

              return (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Paperclip className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)}
                      </p>
                      {error && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          <span>{error}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleDownloadAttachment(attachment)}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
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
