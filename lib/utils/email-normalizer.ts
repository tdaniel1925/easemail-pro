/**
 * Email HTML Normalizer
 *
 * Fixes common email rendering issues by normalizing HTML structure
 * and removing problematic styles that cause layout issues.
 */

export interface NormalizationOptions {
  removeTableLayouts?: boolean;
  fixImageDimensions?: boolean;
  stripProblematicStyles?: boolean;
  normalizeWhitespace?: boolean;
  fixFontSizes?: boolean;
}

const DEFAULT_OPTIONS: NormalizationOptions = {
  removeTableLayouts: false, // Keep false to preserve original email structure
  fixImageDimensions: true,
  stripProblematicStyles: true,
  normalizeWhitespace: true,
  fixFontSizes: true,
};

/**
 * Normalizes email HTML to fix common rendering issues
 */
export function normalizeEmailHTML(
  html: string,
  options: NormalizationOptions = {}
): string {
  if (!html) return '';

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Parse HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Apply normalizations
    if (opts.fixImageDimensions) {
      fixImageDimensions(doc);
    }

    if (opts.stripProblematicStyles) {
      stripProblematicStyles(doc);
    }

    if (opts.normalizeWhitespace) {
      normalizeWhitespace(doc);
    }

    if (opts.fixFontSizes) {
      fixFontSizes(doc);
    }

    if (opts.removeTableLayouts) {
      removeTableLayouts(doc);
    }

    // Additional fixes
    fixNestedTables(doc);
    fixEmptyParagraphs(doc);
    removeInvisibleElements(doc);

    // Return normalized HTML
    return doc.body.innerHTML;
  } catch (error) {
    console.error('Error normalizing email HTML:', error);
    return html; // Return original if normalization fails
  }
}

/**
 * Fix image dimensions to prevent layout issues
 */
function fixImageDimensions(doc: Document): void {
  doc.querySelectorAll('img').forEach((img) => {
    // Remove fixed width/height attributes
    img.removeAttribute('width');
    img.removeAttribute('height');

    // Add responsive styles
    const currentStyle = img.getAttribute('style') || '';
    const newStyle = `${currentStyle}; max-width: 100%; height: auto; display: block;`;
    img.setAttribute('style', newStyle.replace(/;{2,}/g, ';'));
  });
}

/**
 * Strip problematic inline styles that cause layout issues
 */
function stripProblematicStyles(doc: Document): void {
  doc.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style') || '';

    // List of problematic style properties to remove
    const problematicProps = [
      'position',
      'z-index',
      'top',
      'left',
      'right',
      'bottom',
      'transform',
      'overflow-x',
      'min-width: 600px', // Remove fixed min-widths
      'width: 600px', // Remove fixed widths that cause horizontal scroll
    ];

    // Filter out problematic styles
    const cleanedStyle = style
      .split(';')
      .filter((prop) => {
        const trimmed = prop.trim().toLowerCase();
        return !problematicProps.some((bad) => trimmed.startsWith(bad));
      })
      .join(';');

    if (cleanedStyle.trim()) {
      el.setAttribute('style', cleanedStyle);
    } else {
      el.removeAttribute('style');
    }
  });
}

/**
 * Normalize excessive whitespace that causes vertical gaps
 * NOTE: Be conservative - preserve intentional blank lines for email formatting
 */
function normalizeWhitespace(doc: Document): void {
  // Remove excessive <br> tags (more than 3 in a row - allow some for spacing)
  doc.querySelectorAll('br').forEach((br) => {
    let consecutiveBrs = 0;
    let sibling = br.nextSibling;

    while (sibling && sibling.nodeName === 'BR') {
      consecutiveBrs++;
      if (consecutiveBrs > 2) { // Allow up to 3 consecutive <br> tags
        const toRemove = sibling;
        sibling = sibling.nextSibling;
        toRemove.remove();
      } else {
        sibling = sibling.nextSibling;
      }
    }
  });

  // REMOVED: Don't remove empty divs/paragraphs - they're often used for intentional spacing
  // The email display CSS now handles empty paragraphs properly
}

/**
 * Fix font sizes that are too large or use deprecated tags
 */
function fixFontSizes(doc: Document): void {
  // Convert <font> tags to spans
  doc.querySelectorAll('font').forEach((font) => {
    const span = doc.createElement('span');
    const size = font.getAttribute('size');
    const color = font.getAttribute('color');
    const face = font.getAttribute('face');

    let style = '';
    if (color) style += `color: ${color};`;
    if (face) style += `font-family: ${face};`;

    // Convert old font sizes to modern values
    if (size) {
      const sizeMap: Record<string, string> = {
        '1': '10px',
        '2': '12px',
        '3': '14px',
        '4': '16px',
        '5': '18px',
        '6': '20px',
        '7': '24px',
      };
      style += `font-size: ${sizeMap[size] || '14px'};`;
    }

    if (style) span.setAttribute('style', style);
    span.innerHTML = font.innerHTML;
    font.replaceWith(span);
  });

  // Cap extremely large font sizes
  doc.querySelectorAll('[style*="font-size"]').forEach((el) => {
    const style = el.getAttribute('style') || '';
    const updatedStyle = style.replace(
      /font-size:\s*(\d+)(px|pt|em)/gi,
      (match, size, unit) => {
        const numSize = parseInt(size, 10);
        if (unit === 'px' && numSize > 32) return 'font-size: 32px';
        if (unit === 'pt' && numSize > 24) return 'font-size: 24pt';
        if (unit === 'em' && numSize > 2) return 'font-size: 2em';
        return match;
      }
    );
    el.setAttribute('style', updatedStyle);
  });
}

/**
 * Remove table layouts (optional - use carefully)
 */
function removeTableLayouts(doc: Document): void {
  // Only remove tables used purely for layout (no borders, no data)
  doc.querySelectorAll('table').forEach((table) => {
    const hasData = table.querySelector('th');
    const hasBorder = table.getAttribute('border') !== '0';

    if (!hasData && !hasBorder) {
      // This is likely a layout table, convert to div
      const div = doc.createElement('div');
      div.innerHTML = table.innerHTML;
      table.replaceWith(div);
    }
  });
}

/**
 * Fix deeply nested tables that cause rendering issues
 */
function fixNestedTables(doc: Document): void {
  doc.querySelectorAll('table table table table').forEach((nestedTable) => {
    // Flatten tables nested more than 3 levels deep
    const div = doc.createElement('div');
    div.innerHTML = nestedTable.innerHTML;
    nestedTable.replaceWith(div);
  });
}

/**
 * Handle empty paragraphs - convert to nbsp for consistent rendering
 * NOTE: Don't remove empty paragraphs as they're used for intentional spacing
 */
function fixEmptyParagraphs(doc: Document): void {
  doc.querySelectorAll('p').forEach((p) => {
    const text = p.textContent?.trim();
    const hasChildren = p.children.length > 0;

    // Instead of removing empty paragraphs, add &nbsp; to ensure they render
    if (!text && !hasChildren) {
      p.innerHTML = '&nbsp;';
    }
  });
}

/**
 * Remove invisible elements (0 width/height, display:none, etc.)
 */
function removeInvisibleElements(doc: Document): void {
  doc.querySelectorAll('[style*="display: none"], [style*="display:none"]').forEach((el) => {
    el.remove();
  });

  doc.querySelectorAll('[style*="width: 0"], [style*="height: 0"]').forEach((el) => {
    el.remove();
  });
}

/**
 * Quick fix for common email issues without full parsing
 * NOTE: Preserve intentional blank lines for email formatting
 */
export function quickFixEmailHTML(html: string): string {
  if (!html) return '';

  let fixed = html;

  // Remove excessive line breaks (more than 3 in a row)
  fixed = fixed.replace(/(<br\s*\/?>\s*){4,}/gi, '<br><br><br>');

  // Convert empty paragraphs to &nbsp; paragraphs (don't remove them)
  fixed = fixed.replace(/<p[^>]*>\s*<\/p>/gi, '<p>&nbsp;</p>');

  // Fix images without proper sizing
  fixed = fixed.replace(
    /<img([^>]*?)>/gi,
    (match) => {
      if (!match.includes('style=')) {
        return match.replace('>', ' style="max-width: 100%; height: auto;">');
      }
      return match;
    }
  );

  return fixed;
}
