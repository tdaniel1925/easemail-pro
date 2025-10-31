/**
 * Attachment Utility Functions
 */

import type { FileCategory, FileTypeConfig } from './types';

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Get file type category from extension
 */
export function getFileCategory(extension: string | null): FileCategory {
  if (!extension) return 'other';
  
  const ext = extension.toLowerCase();
  
  // Documents
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return 'document';
  }
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  
  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) {
    return 'spreadsheet';
  }
  
  // Presentations
  if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
    return 'presentation';
  }
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return 'archive';
  }
  
  return 'other';
}

/**
 * Get file type color for UI
 */
export function getFileTypeColor(extension: string | null): string {
  const category = getFileCategory(extension);
  
  const colors: Record<FileCategory, string> = {
    document: '#EF4444',
    image: '#8B5CF6',
    spreadsheet: '#10B981',
    presentation: '#F59E0B',
    archive: '#6B7280',
    other: '#9CA3AF',
  };
  
  return colors[category];
}

/**
 * Get file type icon name
 */
export function getFileTypeIcon(extension: string | null): string {
  const category = getFileCategory(extension);
  
  const icons: Record<FileCategory, string> = {
    document: 'DocumentIcon',
    image: 'PhotoIcon',
    spreadsheet: 'TableCellsIcon',
    presentation: 'PresentationChartBarIcon',
    archive: 'ArchiveBoxIcon',
    other: 'DocumentIcon',
  };
  
  return icons[category];
}

/**
 * Check if file can be previewed
 */
export function canPreviewFile(mimeType: string, extension: string | null): boolean {
  // Images
  if (mimeType.startsWith('image/')) return true;
  
  // PDFs
  if (mimeType === 'application/pdf') return true;
  
  // Text files
  if (mimeType.startsWith('text/')) return true;
  
  return false;
}

/**
 * Get preview type for file
 */
export function getPreviewType(mimeType: string): 'image' | 'pdf' | 'text' | 'unsupported' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('text/')) return 'text';
  return 'unsupported';
}

/**
 * Truncate filename for display
 */
export function truncateFilename(filename: string, maxLength: number = 40): string {
  if (filename.length <= maxLength) return filename;
  
  const extension = filename.split('.').pop();
  const nameLength = maxLength - (extension?.length || 0) - 4; // -4 for "..." and "."
  const name = filename.substring(0, nameLength);
  
  return `${name}...${extension ? '.' + extension : ''}`;
}

/**
 * Parse date range preset
 */
export function parseDateRangePreset(preset: string): { from: Date; to: Date } | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return {
        from: today,
        to: now,
      };
    
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: yesterday,
        to: today,
      };
    
    case 'last7days':
      const week = new Date(today);
      week.setDate(week.getDate() - 7);
      return {
        from: week,
        to: now,
      };
    
    case 'last30days':
      const month = new Date(today);
      month.setDate(month.getDate() - 30);
      return {
        from: month,
        to: now,
      };
    
    case 'last90days':
      const quarter = new Date(today);
      quarter.setDate(quarter.getDate() - 90);
      return {
        from: quarter,
        to: now,
      };
    
    case 'thisYear':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: now,
      };
    
    default:
      return null;
  }
}

/**
 * Group attachments by date
 */
export function groupAttachmentsByDate<T extends { emailDate: Date | string | null }>(
  attachments: T[]
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  
  attachments.forEach((attachment) => {
    if (!attachment.emailDate) return;
    
    const date = new Date(attachment.emailDate);
    const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!groups[key]) {
      groups[key] = [];
    }
    
    groups[key].push(attachment);
  });
  
  return groups;
}

/**
 * Calculate storage usage percentage
 */
export function calculateStoragePercentage(used: number, limit: number): number {
  if (limit === 0) return 0;
  return Math.min(Math.round((used / limit) * 100), 100);
}

/**
 * Get storage tier label
 */
export function getStorageTierLabel(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  
  if (gb < 1) return 'Light user';
  if (gb < 5) return 'Regular user';
  if (gb < 10) return 'Heavy user';
  return 'Power user';
}

