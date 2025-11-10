import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes email HTML content with proper security and formatting
 * @param html - Raw HTML content
 * @param showImages - Whether to load external images
 * @returns Sanitized HTML string
 */
export function sanitizeEmailHTML(html: string, showImages: boolean = false): string {
  if (!html) return '';

  // Configure DOMPurify with secure settings
  const config: any = {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'img', 'div', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote',
      'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr',
      'dl', 'dt', 'dd', 'sub', 'sup', 'small', 'mark', 'del', 'ins', 'font',
      'center', 'article', 'section', 'header', 'footer'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
      'width', 'height', 'align', 'valign', 'border', 'cellpadding', 'cellspacing',
      'bgcolor', 'color', 'face', 'size'
    ],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|data|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Add hooks to sanitize styles
    ADD_TAGS: [],
    ADD_ATTR: [],
  };

  // Sanitize the HTML and convert to string
  let sanitized = String(DOMPurify.sanitize(html, config));

  // Block external images if showImages is false
  if (!showImages) {
    sanitized = blockExternalImages(sanitized);
  }

  // Apply formatting improvements
  sanitized = applyEmailFormatting(sanitized);

  return sanitized;
}

/**
 * Blocks external images by replacing img src with placeholder
 * @param html - Sanitized HTML
 * @returns HTML with blocked images
 */
function blockExternalImages(html: string): string {
  // Replace all img tags with a placeholder
  return html.replace(
    /<img\s+[^>]*src=["']([^"']*)["'][^>]*>/gi,
    (match, src) => {
      // Keep data URIs (inline images), cid: (Content-ID inline images), and blob: URLs
      if (src.startsWith('data:') || src.startsWith('cid:') || src.startsWith('blob:')) {
        return match;
      }
      // Replace external images with placeholder
      return `<div class="blocked-image" style="background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 16px; text-align: center; color: #6b7280; margin: 8px 0;">
        <svg style="width: 48px; height: 48px; margin: 0 auto 8px; opacity: 0.5;" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"/>
        </svg>
        <div style="font-size: 13px;">External image blocked for privacy</div>
        <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">Enable in settings to view</div>
      </div>`;
    }
  );
}

/**
 * Applies formatting improvements to email HTML
 * @param html - Sanitized HTML
 * @returns Formatted HTML
 */
function applyEmailFormatting(html: string): string {
  // Wrap content in a constrained div with proper styling
  return `<div style="
    max-width: 100%;
    word-wrap: break-word;
    overflow-wrap: break-word;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1f2937;
  ">
    <style>
      .email-content {
        color: #1f2937 !important;
      }
      .email-content * {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      .email-content img {
        height: auto !important;
        max-height: 500px !important;
      }
      .email-content table {
        border-collapse: collapse;
        max-width: 100%;
      }
      .email-content table td,
      .email-content table th {
        padding: 8px;
        vertical-align: top;
      }
      .email-content a {
        color: #3b82f6 !important;
        text-decoration: underline;
      }
      .email-content a:hover {
        color: #2563eb !important;
      }
      .email-content pre {
        background: #f3f4f6;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 13px;
      }
      .email-content blockquote {
        border-left: 3px solid #e5e7eb;
        padding-left: 16px;
        margin: 16px 0;
        color: #6b7280;
      }
      /* Force readable text color for email content, but respect inline styles */
      .email-content p:not([style*="color"]),
      .email-content div:not([style*="color"]):not([bgcolor]),
      .email-content span:not([style*="color"]),
      .email-content td:not([style*="color"]):not([bgcolor]),
      .email-content th:not([style*="color"]):not([bgcolor]),
      .email-content li:not([style*="color"]) {
        color: #1f2937 !important;
      }
    </style>
    <div class="email-content">
      ${html}
    </div>
  </div>`;
}

/**
 * Extracts plain text from HTML for preview
 * @param html - HTML content
 * @returns Plain text
 */
export function extractPlainText(html: string): string {
  if (!html) return '';

  // Remove HTML tags
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}
