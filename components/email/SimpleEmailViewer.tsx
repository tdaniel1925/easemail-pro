'use client';

import { useEffect, useRef } from 'react';

interface SimpleEmailViewerProps {
  body: string;  // The HTML from Nylas
  bodyText?: string; // Plain text fallback
  attachments?: Array<{
    id: string;
    contentId?: string;
    contentType: string;
  }>;
  accountId?: string;
  messageId?: string;
}

/**
 * Simple Email Viewer - No Complex Normalization
 *
 * This component follows the guide's recommendation:
 * - Just display the HTML as-is
 * - Basic XSS protection (remove scripts)
 * - Let email control its own layout
 * - CSS isolation to prevent conflicts
 */
export function SimpleEmailViewer({ body, bodyText, attachments, accountId, messageId }: SimpleEmailViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const content = body || bodyText;
    if (!content) return;

    console.log('📧 SimpleEmailViewer rendering:', {
      hasBody: !!body,
      hasBodyText: !!bodyText,
      bodyLength: body?.length || 0,
      bodyPreview: body?.substring(0, 200) || 'No body',
      attachmentCount: attachments?.length || 0
    });

    // Simple: just set innerHTML with basic sanitization
    // This is what Gmail/Outlook do under the hood
    let sanitized = basicSanitize(content);

    // Remove leading whitespace that causes blank space at start
    sanitized = removeLeadingWhitespace(sanitized);

    // Replace cid: references with actual attachment URLs
    if (attachments && accountId && messageId) {
      sanitized = resolveCidReferences(sanitized, attachments, accountId, messageId);
    }

    containerRef.current.innerHTML = sanitized;

    // Make all links open in new tab
    const links = containerRef.current.querySelectorAll('a');
    links.forEach(link => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    // Fix images - make responsive
    const images = containerRef.current.querySelectorAll('img');
    images.forEach(img => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';

      // Hide tracking pixels (1x1 images)
      if (img.width === 1 || img.height === 1) {
        img.style.display = 'none';
      }
    });
  }, [body, bodyText, attachments, accountId, messageId]);

  if (!body && !bodyText) {
    return <div className="p-4 text-muted-foreground">No email content</div>;
  }

  return (
    <div
      ref={containerRef}
      className="email-content"
      style={{
        maxWidth: '100%',
        overflowX: 'auto',
        wordWrap: 'break-word',
        isolation: 'isolate', // Prevent CSS conflicts
        padding: 0, // Remove padding to eliminate white space
        margin: 0,
      }}
    />
  );
}

/**
 * Basic sanitization - removes scripts but keeps formatting
 *
 * This is intentionally simple. Don't over-engineer it.
 */
function basicSanitize(html: string): string {
  if (!html) return '';

  return html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '')
    // Remove javascript: protocols
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    .replace(/src="javascript:[^"]*"/gi, 'src=""');
}

/**
 * Remove leading whitespace that causes blank space at top of email
 */
function removeLeadingWhitespace(html: string): string {
  if (!html) return '';

  return html
    // Remove leading <br> tags
    .replace(/^(\s*<br\s*\/?>\s*)+/gi, '')
    // Remove leading empty paragraphs
    .replace(/^(\s*<p[^>]*>\s*(&nbsp;|\s)*<\/p>\s*)+/gi, '')
    // Remove leading empty divs
    .replace(/^(\s*<div[^>]*>\s*(&nbsp;|\s)*<\/div>\s*)+/gi, '')
    // Trim leading whitespace
    .trimStart();
}

/**
 * Resolve cid: references in HTML to actual attachment URLs
 *
 * Many emails use Content-ID (cid:) references for inline images like logos.
 * This function replaces cid: references with actual download URLs.
 */
function resolveCidReferences(
  html: string,
  attachments: Array<{ id: string; contentId?: string; contentType: string }>,
  accountId: string,
  messageId: string
): string {
  if (!html || !attachments || attachments.length === 0) return html;

  // Create a map of contentId -> attachment
  const cidMap = new Map<string, { id: string; contentType: string }>();
  attachments.forEach(att => {
    if (att.contentId) {
      // Content-ID might be wrapped in angle brackets like <image001@example.com>
      const cleanCid = att.contentId.replace(/^<|>$/g, '');
      cidMap.set(cleanCid, { id: att.id, contentType: att.contentType });
    }
  });

  // Replace all cid: references with download URLs
  return html.replace(/src=["']cid:([^"']+)["']/gi, (match, cid) => {
    const attachment = cidMap.get(cid);
    if (attachment) {
      // Build the download URL
      const params = new URLSearchParams({
        grantId: accountId,
        attachmentId: attachment.id,
        messageId: messageId,
      });
      const downloadUrl = `/api/nylas-v3/attachments/download?${params.toString()}`;
      console.log(`📎 Resolved cid:${cid} to attachment ${attachment.id}`);
      return `src="${downloadUrl}"`;
    }
    console.warn(`⚠️ Could not resolve cid:${cid} - no matching attachment found`);
    return match; // Keep original if not found
  });
}
