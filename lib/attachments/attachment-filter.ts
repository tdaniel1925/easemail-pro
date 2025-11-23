/**
 * Attachment Filter Utility
 * Determines which file types should be indexed in the attachments page
 *
 * EXCLUDED: Calendar files (.ics), signature files (.vcf, .p7s), inline images
 * INCLUDED: Documents, media files, archives, spreadsheets, presentations
 */

// File extensions that should be EXCLUDED from attachment indexing
const EXCLUDED_EXTENSIONS = new Set([
  'ics',    // Calendar invitations (handled separately in EmailDetail)
  'vcf',    // vCard contact files
  'p7s',    // S/MIME signature files
  'asc',    // PGP signature files
  'sig',    // Generic signature files
  'eml',    // Embedded email messages (usually just metadata)
  'winmail.dat', // Outlook proprietary format (typically just metadata)
]);

// Content types that should be EXCLUDED
const EXCLUDED_MIME_PATTERNS = [
  'text/calendar',           // .ics files
  'application/ics',         // Alternative .ics MIME type
  'text/x-vcalendar',        // Legacy calendar format
  'application/pkcs7-signature', // S/MIME signatures
  'application/x-pkcs7-signature',
  'application/pgp-signature', // PGP signatures
];

// Allowed file categories with extensions
const ALLOWED_CATEGORIES = {
  // Documents
  documents: [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
    'pages', 'md', 'tex'
  ],

  // Spreadsheets
  spreadsheets: [
    'xls', 'xlsx', 'csv', 'xlsm', 'xlsb',
    'ods', 'numbers'
  ],

  // Presentations
  presentations: [
    'ppt', 'pptx', 'pptm', 'key', 'odp'
  ],

  // Images
  images: [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
    'webp', 'tiff', 'tif', 'ico', 'heic', 'heif'
  ],

  // Videos
  videos: [
    'mp4', 'mov', 'avi', 'wmv', 'flv', 'webm',
    'mkv', 'm4v', 'mpg', 'mpeg'
  ],

  // Audio
  audio: [
    'mp3', 'wav', 'aac', 'm4a', 'flac', 'ogg',
    'wma', 'opus', 'aiff'
  ],

  // Archives
  archives: [
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    'xz', 'dmg', 'iso'
  ],

  // Code files
  code: [
    'js', 'ts', 'jsx', 'tsx', 'py', 'java',
    'cpp', 'c', 'h', 'cs', 'go', 'rb', 'php',
    'html', 'css', 'json', 'xml', 'yaml', 'yml',
    'sql', 'sh', 'bash', 'ps1', 'swift', 'kt'
  ],

  // Other common document types
  other: [
    'sketch', 'fig', 'ai', 'psd', 'xd',  // Design files
    'epub', 'mobi', 'azw3',               // E-books
    'dwg', 'dxf', 'stl', 'obj',          // CAD files
  ]
};

// Flatten all allowed extensions
const ALLOWED_EXTENSIONS = new Set(
  Object.values(ALLOWED_CATEGORIES).flat()
);

/**
 * Determines if an attachment should be indexed
 * Returns true if the file should be saved to the attachments page
 */
export function shouldIndexAttachment(options: {
  filename: string;
  contentType?: string;
  isInline?: boolean;
  size?: number;
}): { shouldIndex: boolean; reason?: string } {
  const { filename, contentType, isInline, size } = options;

  // 1. Skip inline images (embedded in email body)
  if (isInline) {
    return { shouldIndex: false, reason: 'Inline content' };
  }

  // 2. Skip very large files (>20MB)
  if (size && size > 20 * 1024 * 1024) {
    return { shouldIndex: false, reason: 'File too large (>20MB)' };
  }

  // 3. Get file extension
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  // 4. Check if extension is explicitly excluded
  if (EXCLUDED_EXTENSIONS.has(extension)) {
    return { shouldIndex: false, reason: `Excluded file type (.${extension})` };
  }

  // 5. Check if MIME type is excluded
  if (contentType) {
    const lowerMime = contentType.toLowerCase();
    for (const pattern of EXCLUDED_MIME_PATTERNS) {
      if (lowerMime.includes(pattern)) {
        return { shouldIndex: false, reason: `Excluded content type (${pattern})` };
      }
    }
  }

  // 6. Check if extension is in allowed list
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    // Unknown/uncommon file type - still allow but log a warning
    console.warn(`⚠️  Allowing uncommon file type: .${extension} (${filename})`);
  }

  return { shouldIndex: true };
}

/**
 * Get the category of an attachment based on file extension
 */
export function getAttachmentCategory(filename: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  for (const [category, extensions] of Object.entries(ALLOWED_CATEGORIES)) {
    if (extensions.includes(extension)) {
      return category;
    }
  }

  return null;
}

/**
 * Get a human-readable description of why a file was excluded
 */
export function getExclusionReason(filename: string, contentType?: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  if (EXCLUDED_EXTENSIONS.has(extension)) {
    switch (extension) {
      case 'ics':
        return 'Calendar invitation (shown in email)';
      case 'vcf':
        return 'Contact card (vCard)';
      case 'p7s':
      case 'asc':
      case 'sig':
        return 'Email signature file';
      case 'eml':
        return 'Embedded email message';
      default:
        return `Excluded file type (.${extension})`;
    }
  }

  if (contentType) {
    const lowerMime = contentType.toLowerCase();
    if (lowerMime.includes('calendar')) {
      return 'Calendar file (shown in email)';
    }
    if (lowerMime.includes('signature')) {
      return 'Signature file';
    }
  }

  return null;
}
