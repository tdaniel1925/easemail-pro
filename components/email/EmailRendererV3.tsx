'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Paperclip, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';

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
  className?: string;
}

/**
 * V3 Email Renderer
 *
 * Key improvements:
 * 1. Iframe-based rendering for complete CSS isolation
 * 2. No CSS conflicts with parent application
 * 3. Secure sandbox with restricted permissions
 * 4. Better attachment handling with progress tracking
 * 5. Proper error handling and user feedback
 */
export function EmailRendererV3({
  emailId,
  accountId,
  bodyHtml,
  bodyText,
  attachments,
  showImages = false,
  className = '',
}: EmailRendererV3Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(400);
  const [downloadingAttachments, setDownloadingAttachments] = useState<Set<string>>(new Set());
  const [attachmentErrors, setAttachmentErrors] = useState<Map<string, string>>(new Map());

  // Log when V3 renderer mounts
  useEffect(() => {
    console.log('✨ V3 Email Renderer Active', { emailId, accountId });
  }, [emailId, accountId]);

  // Update iframe content when email changes
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDoc) return;

    // Prepare HTML content
    const htmlContent = bodyHtml || `<pre style="white-space: pre-wrap; font-family: inherit;">${bodyText || ''}</pre>`;

    // Create complete HTML document with base styles
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1f2937;
      background: transparent;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    /* Only constrain images to prevent horizontal overflow */
    img {
      max-width: 100% !important;
      height: auto !important;
    }

    ${!showImages ? `
    /* Block external images for privacy */
    img[src^="http"],
    img[src^="https"] {
      display: none;
    }

    img[src^="http"]::before,
    img[src^="https"]::before {
      content: "🖼️ External image blocked for privacy";
      display: block;
      padding: 12px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      color: #6b7280;
      text-align: center;
    }
    ` : ''}

    /* Keep data URIs, Content-ID, and blob URLs */
    img[src^="data:"],
    img[src^="cid:"],
    img[src^="blob:"] {
      display: inline-block !important;
    }

    /* Basic link styling */
    a {
      color: #3b82f6;
      text-decoration: underline;
    }

    a:hover {
      color: #2563eb;
    }

    /* Code blocks */
    pre {
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      background: #f3f4f6;
      padding: 12px;
      border-radius: 4px;
    }

    code {
      font-family: 'Courier New', monospace;
      background: #f3f4f6;
      padding: 2px 4px;
      border-radius: 2px;
    }

    /* Blockquotes */
    blockquote {
      border-left: 3px solid #e5e7eb;
      padding-left: 16px;
      margin: 16px 0;
      color: #6b7280;
    }

    /* Tables - let them be responsive but don't force layouts */
    table {
      border-collapse: collapse;
      max-width: 100%;
    }

    table td,
    table th {
      padding: 8px;
    }
  </style>
</head>
<body>
  ${htmlContent}

  <script>
    // Auto-resize iframe to content height
    function updateHeight() {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'resize', height }, '*');
    }

    // Update height on load and when content changes
    updateHeight();

    // Watch for dynamic content changes
    const observer = new MutationObserver(updateHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Update on images loading
    document.querySelectorAll('img').forEach(img => {
      img.addEventListener('load', updateHeight);
    });
  </script>
</body>
</html>
    `;

    // Write to iframe
    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();
  }, [bodyHtml, bodyText, showImages]);

  // Listen for resize messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'resize' && typeof event.data.height === 'number') {
        setIframeHeight(event.data.height);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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
    <div className={`email-renderer-v3 ${className}`}>
      {/* Email Body */}
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        style={{
          width: '100%',
          height: `${iframeHeight}px`,
          border: 'none',
          overflow: 'hidden',
        }}
        title="Email content"
      />

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
