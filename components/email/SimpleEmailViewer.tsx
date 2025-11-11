'use client';

import { useEffect, useRef } from 'react';

interface SimpleEmailViewerProps {
  body: string;  // The HTML from Nylas
  bodyText?: string; // Plain text fallback
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
export function SimpleEmailViewer({ body, bodyText }: SimpleEmailViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const content = body || bodyText;
    if (!content) return;

    console.log('📧 SimpleEmailViewer rendering:', {
      hasBody: !!body,
      hasBodyText: !!bodyText,
      bodyLength: body?.length || 0,
      bodyPreview: body?.substring(0, 200) || 'No body'
    });

    // Simple: just set innerHTML with basic sanitization
    // This is what Gmail/Outlook do under the hood
    let sanitized = basicSanitize(content);

    // Remove leading whitespace that causes blank space at start
    sanitized = removeLeadingWhitespace(sanitized);

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
  }, [body, bodyText]);

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
