/**
 * EaseMail Attachments V1 - TypeScript Type Definitions
 * 
 * Complete type safety for the attachments feature
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export type DocumentType = 
  | 'invoice' 
  | 'receipt' 
  | 'contract' 
  | 'report' 
  | 'presentation'
  | 'image' 
  | 'spreadsheet'
  | 'other';

export type FileCategory =
  | 'document'
  | 'image'
  | 'spreadsheet'
  | 'presentation'
  | 'archive'
  | 'other';

export type AttachmentDirection = 'sent' | 'received';

export type ProcessingStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'retrying';

// ============================================================================
// ATTACHMENT MODEL
// ============================================================================

export interface Attachment {
  // Identity
  id: string;
  userId: string;
  emailId: string | null;
  accountId?: string | null;
  threadId?: string | null;
  
  // File metadata
  filename: string;
  fileExtension: string | null;
  mimeType: string;
  fileSizeBytes: number;
  
  // Storage
  storagePath: string;
  storageUrl?: string | null;
  thumbnailPath?: string | null;
  thumbnailUrl?: string | null;
  
  // Email context
  senderEmail: string | null;
  senderName: string | null;
  emailSubject: string | null;
  emailDate: Date | null;
  
  // AI classification
  documentType?: DocumentType | null;
  classificationConfidence?: number | null;
  extractedMetadata: ExtractedMetadata;
  keyTerms: string[];
  
  // AI processing status
  aiProcessed: boolean;
  processingStatus: string;
  processingError?: string | null;
  processedAt?: Date | null;
  
  // Direction (sent or received)
  direction?: AttachmentDirection;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// EXTRACTED METADATA (AI-Generated)
// ============================================================================

export type ExtractedMetadata = 
  | InvoiceMetadata 
  | ReceiptMetadata 
  | ContractMetadata 
  | GenericMetadata
  | Record<string, never>; // Empty object for unprocessed

export interface InvoiceMetadata {
  type: 'invoice';
  amount?: number;
  currency?: string;
  invoiceNumber?: string;
  dueDate?: string | Date;
  issueDate?: string | Date;
  vendor?: string;
  vendorEmail?: string;
  vendorAddress?: string;
  billTo?: string;
  isPaid?: boolean;
  paymentStatus?: 'paid' | 'unpaid' | 'overdue' | 'pending';
  lineItems?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
  tax?: number;
  subtotal?: number;
  notes?: string;
}

export interface ReceiptMetadata {
  type: 'receipt';
  merchant?: string;
  merchantAddress?: string;
  total?: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  date?: string | Date;
  time?: string;
  location?: string;
  paymentMethod?: string;
  lastFourDigits?: string;
  items?: Array<{
    name: string;
    quantity?: number;
    price?: number;
  }>;
  category?: string; // 'food', 'transport', 'office', etc.
}

export interface ContractMetadata {
  type: 'contract';
  contractType?: string; // 'service_agreement', 'nda', 'employment', etc.
  parties?: string[];
  effectiveDate?: string | Date;
  expirationDate?: string | Date;
  contractValue?: number;
  currency?: string;
  keyTerms?: string[];
  renewalTerms?: string;
  terminationClause?: string;
  governingLaw?: string;
}

export interface GenericMetadata {
  type: 'generic';
  summary?: string;
  keyPoints?: string[];
  entities?: Array<{
    type: 'person' | 'organization' | 'location' | 'date' | 'amount';
    value: string;
  }>;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface GetAttachmentsParams {
  // Pagination
  page?: number;
  limit?: number;

  // Search
  search?: string;

  // Filters
  fileTypes?: string[];
  fileCategories?: FileCategory[];
  documentTypes?: DocumentType[];
  dateFrom?: string | Date;
  dateTo?: string | Date;
  senders?: string[];
  direction?: AttachmentDirection;
  minSize?: number;
  maxSize?: number;

  // AI-powered filters
  aiProcessedOnly?: boolean;
  hasMetadata?: boolean;

  // Sorting
  sortBy?: 'date' | 'name' | 'size' | 'sender' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface GetAttachmentsResponse {
  data: Attachment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: AppliedFilters;
}

export interface AppliedFilters {
  search?: string;
  fileTypes: string[];
  documentTypes: DocumentType[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  senders: string[];
  direction?: AttachmentDirection;
  sizeRange?: {
    min: number;
    max: number;
  };
}

export interface AttachmentStats {
  // Overall stats
  totalAttachments: number;
  totalSizeBytes: number;
  aiProcessedCount: number;
  
  // By document type
  documentTypeCounts: Record<DocumentType, number>;
  
  // By file type
  fileTypeCounts: Record<string, number>;
  
  // By category
  categoryCounts: Record<FileCategory, number>;
  
  // Financial (from extracted metadata)
  financialSummary?: {
    totalInvoices: number;
    totalInvoiceAmount: number;
    unpaidInvoices: number;
    unpaidAmount: number;
    totalReceipts: number;
    totalReceiptAmount: number;
  };
  
  // Time-based
  latestAttachmentDate?: Date;
  oldestAttachmentDate?: Date;
  attachmentsByMonth: Array<{
    month: string;
    count: number;
  }>;
  
  // Top items
  topSenders: Array<{
    email: string;
    name: string | null;
    count: number;
  }>;
  largestFiles: Array<{
    id: string;
    filename: string;
    sizeBytes: number;
  }>;
}

// ============================================================================
// SMART FILTERS
// ============================================================================

export type SmartFilterType =
  | 'unpaid_invoices'
  | 'expiring_contracts'
  | 'receipts_by_amount'
  | 'recent_images'
  | 'large_files'
  | 'unprocessed';

export interface SmartFilter {
  id: SmartFilterType;
  label: string;
  description: string;
  icon: string;
  params: GetAttachmentsParams;
  badge?: string | number;
}

// ============================================================================
// PREVIEW MODAL
// ============================================================================

export interface PreviewModalProps {
  attachment: Attachment;
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
  onOpenEmail: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  canNavigate?: boolean;
}

// ============================================================================
// ATTACHMENT CARD
// ============================================================================

export interface AttachmentCardProps {
  attachment: Attachment;
  onPreview: () => void;
  onDownload: () => void;
  onOpenEmail: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
  showCheckbox?: boolean;
}

// ============================================================================
// FILE TYPE CONFIGURATION
// ============================================================================

export interface FileTypeConfig {
  extension: string;
  category: FileCategory;
  icon: string; // Icon component name or path
  color: string; // Tailwind color or hex
  label: string;
  canPreview: boolean;
  mimeTypes: string[];
}

export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  // Documents
  pdf: {
    extension: 'pdf',
    category: 'document',
    icon: 'DocumentIcon',
    color: '#EF4444',
    label: 'PDF',
    canPreview: true,
    mimeTypes: ['application/pdf'],
  },
  doc: {
    extension: 'doc',
    category: 'document',
    icon: 'DocumentTextIcon',
    color: '#3B82F6',
    label: 'Word',
    canPreview: false,
    mimeTypes: ['application/msword'],
  },
  docx: {
    extension: 'docx',
    category: 'document',
    icon: 'DocumentTextIcon',
    color: '#3B82F6',
    label: 'Word',
    canPreview: false,
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  txt: {
    extension: 'txt',
    category: 'document',
    icon: 'DocumentTextIcon',
    color: '#6B7280',
    label: 'Text',
    canPreview: true,
    mimeTypes: ['text/plain'],
  },
  
  // Spreadsheets
  xls: {
    extension: 'xls',
    category: 'spreadsheet',
    icon: 'TableCellsIcon',
    color: '#10B981',
    label: 'Excel',
    canPreview: false,
    mimeTypes: ['application/vnd.ms-excel'],
  },
  xlsx: {
    extension: 'xlsx',
    category: 'spreadsheet',
    icon: 'TableCellsIcon',
    color: '#10B981',
    label: 'Excel',
    canPreview: false,
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  csv: {
    extension: 'csv',
    category: 'spreadsheet',
    icon: 'TableCellsIcon',
    color: '#059669',
    label: 'CSV',
    canPreview: true,
    mimeTypes: ['text/csv'],
  },
  
  // Presentations
  ppt: {
    extension: 'ppt',
    category: 'presentation',
    icon: 'PresentationChartBarIcon',
    color: '#F59E0B',
    label: 'PowerPoint',
    canPreview: false,
    mimeTypes: ['application/vnd.ms-powerpoint'],
  },
  pptx: {
    extension: 'pptx',
    category: 'presentation',
    icon: 'PresentationChartBarIcon',
    color: '#F59E0B',
    label: 'PowerPoint',
    canPreview: false,
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  },
  
  // Images
  jpg: {
    extension: 'jpg',
    category: 'image',
    icon: 'PhotoIcon',
    color: '#8B5CF6',
    label: 'JPEG',
    canPreview: true,
    mimeTypes: ['image/jpeg'],
  },
  jpeg: {
    extension: 'jpeg',
    category: 'image',
    icon: 'PhotoIcon',
    color: '#8B5CF6',
    label: 'JPEG',
    canPreview: true,
    mimeTypes: ['image/jpeg'],
  },
  png: {
    extension: 'png',
    category: 'image',
    icon: 'PhotoIcon',
    color: '#8B5CF6',
    label: 'PNG',
    canPreview: true,
    mimeTypes: ['image/png'],
  },
  gif: {
    extension: 'gif',
    category: 'image',
    icon: 'GifIcon',
    color: '#EC4899',
    label: 'GIF',
    canPreview: true,
    mimeTypes: ['image/gif'],
  },
  webp: {
    extension: 'webp',
    category: 'image',
    icon: 'PhotoIcon',
    color: '#8B5CF6',
    label: 'WebP',
    canPreview: true,
    mimeTypes: ['image/webp'],
  },
  
  // Archives
  zip: {
    extension: 'zip',
    category: 'archive',
    icon: 'ArchiveBoxIcon',
    color: '#6B7280',
    label: 'ZIP',
    canPreview: false,
    mimeTypes: ['application/zip'],
  },
  rar: {
    extension: 'rar',
    category: 'archive',
    icon: 'ArchiveBoxIcon',
    color: '#6B7280',
    label: 'RAR',
    canPreview: false,
    mimeTypes: ['application/x-rar-compressed'],
  },
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface AttachmentDownloadInfo {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AttachmentPreviewInfo {
  url: string;
  type: 'image' | 'pdf' | 'text' | 'unsupported';
  thumbnailUrl?: string;
}

// ============================================================================
// PROCESSING QUEUE
// ============================================================================

export interface AttachmentProcessingJob {
  id: string;
  attachmentId: string;
  status: ProcessingStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  lastError?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// HOOKS & STATE MANAGEMENT
// ============================================================================

export interface UseAttachmentsOptions {
  params?: GetAttachmentsParams;
  enabled?: boolean;
  refetchInterval?: number;
}

export interface AttachmentsState {
  attachments: Attachment[];
  selectedIds: string[];
  filters: AppliedFilters;
  view: 'grid' | 'list';
  sortBy: 'date' | 'name' | 'size' | 'sender' | 'type';
  sortOrder: 'asc' | 'desc';
  previewAttachment: Attachment | null;
}

export interface AttachmentsActions {
  setAttachments: (attachments: Attachment[]) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setFilters: (filters: Partial<AppliedFilters>) => void;
  clearFilters: () => void;
  setView: (view: 'grid' | 'list') => void;
  setSorting: (sortBy: AttachmentsState['sortBy'], sortOrder: AttachmentsState['sortOrder']) => void;
  openPreview: (attachment: Attachment) => void;
  closePreview: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ATTACHMENT_LIMITS = {
  FREE_TIER: {
    maxAttachments: 500,
    maxStorageBytes: 2 * 1024 * 1024 * 1024, // 2GB
    maxAIProcessingPerMonth: 50,
  },
  PRO_TIER: {
    maxAttachments: -1, // Unlimited
    maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50GB
    maxAIProcessingPerMonth: -1, // Unlimited
  },
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB per file
} as const;

export const PAGINATION_DEFAULTS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
} as const;

export const THUMBNAIL_CONFIG = {
  WIDTH: 400,
  HEIGHT: 300,
  QUALITY: 80,
  FORMAT: 'webp',
} as const;

