'use client';

import { useEffect, useRef } from 'react';
import DOMPurify from 'isomorphic-dompurify';

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

    // Secure HTML sanitization using DOMPurify
    let sanitized = sanitizeHtml(content);

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
 * Secure HTML sanitization using DOMPurify
 *
 * DOMPurify is a battle-tested XSS sanitizer that handles:
 * - Script tags and event handlers
 * - Data URIs with JavaScript
 * - SVG-based XSS vectors
 * - Encoded/obfuscated attacks
 * - And many more edge cases
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Configure DOMPurify to allow safe HTML while blocking XSS
  return DOMPurify.sanitize(html, {
    // Allow common HTML tags for email formatting
    ALLOWED_TAGS: [
      'a', 'abbr', 'address', 'article', 'aside', 'b', 'bdi', 'bdo', 'blockquote',
      'br', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'dd', 'del', 'dfn',
      'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3',
      'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img', 'ins', 'kbd', 'li', 'main',
      'mark', 'nav', 'ol', 'p', 'picture', 'pre', 'q', 'rp', 'rt', 'ruby', 's',
      'samp', 'section', 'small', 'source', 'span', 'strong', 'sub', 'sup', 'table',
      'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
      'font', 'center', 'style',
    ],
    // Allow safe attributes
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'width', 'height',
      'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'bgcolor',
      'color', 'face', 'size', 'colspan', 'rowspan', 'target', 'rel',
    ],
    // Allow data: URIs for images only (base64 encoded images in emails)
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    // Block dangerous URI schemes
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|cid):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
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
