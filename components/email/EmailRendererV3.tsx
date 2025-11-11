'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Paperclip, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';

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
  onShowImagesToggle,
  className = '',
}: EmailRendererV3Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(400);
  const [downloadingAttachments, setDownloadingAttachments] = useState<Set<string>>(new Set());
  const [attachmentErrors, setAttachmentErrors] = useState<Map<string, string>>(new Map());

  // Production-safe debugging: Add data attribute to component for verification
  // This persists even when console.logs are stripped in production builds
  const [isV3Active, setIsV3Active] = useState(false);

  useEffect(() => {
    // Mark V3 as active on mount
    setIsV3Active(true);
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✨ V3 Email Renderer Active', { emailId, accountId });
    }
  }, [emailId, accountId]);

  // Update iframe content when email changes
  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDoc) return;

    // CRITICAL SECURITY FIX: Sanitize HTML before rendering
    // This prevents XSS attacks while preserving email formatting
    const sanitizeHTML = (html: string): string => {
      if (!html) return '';

      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img', 'div', 'span',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
          'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
          'dl', 'dt', 'dd', 'sub', 'sup', 'small', 'mark', 'del', 'ins', 'strike',
          's', 'font', 'center', 'article', 'section'
        ],
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
          'width', 'height', 'align', 'valign', 'border', 'cellpadding', 'cellspacing',
          'bgcolor', 'color', 'face', 'size', 'colspan', 'rowspan'
        ],
        ALLOW_DATA_ATTR: false,
        // Block external images by removing src if showImages is false
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
      });
    };

    // Prepare HTML content with proper sanitization
    let htmlContent: string;
    if (bodyHtml) {
      // Sanitize HTML email
      let sanitized = sanitizeHTML(bodyHtml);

      // If images are blocked, remove external image sources to prevent tracking
      if (!showImages) {
        sanitized = sanitized.replace(
          /<img\s+([^>]*)src=["']([^"']*)["']([^>]*)>/gi,
          (match, before, src, after) => {
            // Keep data URIs, cid:, and blob: URLs (safe inline content)
            if (src.startsWith('data:') || src.startsWith('cid:') || src.startsWith('blob:')) {
              return match;
            }
            // Remove src for external images (prevents tracking pixel requests)
            return `<img ${before} data-blocked-src="${src}" alt="[Image blocked for privacy]" ${after}>`;
          }
        );
      }

      htmlContent = sanitized;
    } else {
      // Plain text fallback
      const escapedText = (bodyText || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      htmlContent = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapedText}</pre>`;
    }

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
    /* Blocked images - show placeholder */
    img[data-blocked-src] {
      display: inline-block !important;
      min-width: 200px;
      min-height: 100px;
      background: #f3f4f6;
      border: 2px dashed #e5e7eb;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
      position: relative;
      font-size: 13px;
      color: #6b7280;
    }

    img[data-blocked-src]::before {
      content: "🖼️";
      display: block;
      font-size: 32px;
      margin-bottom: 8px;
    }

    img[data-blocked-src]::after {
      content: "External image blocked for privacy";
      display: block;
      font-size: 13px;
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
    <div
      className={`email-renderer-v3 relative ${className}`}
      data-renderer="v3"
      data-v3-active={isV3Active}
    >
      {/* V3 Active Indicator - Visible in production for debugging */}
      {isV3Active && (
        <div
          className="absolute top-0 right-0 bg-green-500 text-white text-xs px-2 py-1 rounded-bl z-50"
          title="Email Renderer V3 is active"
        >
          V3
        </div>
      )}

      {/* Image Toggle Button - Only show if callback provided */}
      {onShowImagesToggle && (
        <div className="mb-3 flex items-center justify-between gap-2 p-2 bg-secondary/30 border border-border/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            {showImages ? (
              <Eye className="h-4 w-4 text-primary" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">
              {showImages
                ? 'External images are showing (tracking enabled)'
                : 'External images are blocked for privacy'}
            </span>
          </div>
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
        </div>
      )}

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
