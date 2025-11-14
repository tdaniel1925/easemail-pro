/**
 * Contacts V4 TypeScript Types
 * Matching Nylas V3 API Structure and Database Schema
 */

// ============================================
// NYLAS API TYPES
// ============================================

export interface NylasEmail {
  type?: 'work' | 'personal' | 'other';
  email: string;
}

export interface NylasPhoneNumber {
  type?: 'work' | 'home' | 'mobile' | 'fax' | 'pager' | 'other';
  number: string;
}

export interface NylasPhysicalAddress {
  type?: 'work' | 'home' | 'other';
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface NylasWebPage {
  type?: 'profile' | 'blog' | 'homepage' | 'other';
  url: string;
}

export interface NylasIMAddress {
  type?: string;
  im_address: string;
}

export interface NylasContactGroup {
  id: string;
  name: string;
  group_type?: 'system' | 'user';
  path?: string;
}

export interface NylasContact {
  id: string;
  grant_id: string;
  object: 'contact';

  // Name fields
  given_name?: string;
  middle_name?: string;
  surname?: string;
  suffix?: string;
  nickname?: string;

  // Contact information
  emails?: NylasEmail[];
  phone_numbers?: NylasPhoneNumber[];
  physical_addresses?: NylasPhysicalAddress[];
  web_pages?: NylasWebPage[];
  im_addresses?: NylasIMAddress[];

  // Professional
  job_title?: string;
  company_name?: string;
  manager_name?: string;
  office_location?: string;
  department?: string;

  // Personal
  birthday?: string; // ISO date format
  notes?: string;

  // Picture
  picture_url?: string;
  picture?: string; // Base64 encoded when profile_picture=true

  // Groups
  groups?: NylasContactGroup[];

  // Metadata
  source?: 'address_book' | 'domain' | 'inbox';
  updated_at?: number; // Unix timestamp
}

export interface NylasContactListResponse {
  data: NylasContact[];
  request_id: string;
  next_cursor?: string;
}

export interface NylasContactCreateRequest {
  given_name?: string;
  middle_name?: string;
  surname?: string;
  suffix?: string;
  nickname?: string;
  emails?: NylasEmail[];
  phone_numbers?: NylasPhoneNumber[];
  physical_addresses?: NylasPhysicalAddress[];
  web_pages?: NylasWebPage[];
  im_addresses?: NylasIMAddress[];
  job_title?: string;
  company_name?: string;
  manager_name?: string;
  office_location?: string;
  department?: string;
  birthday?: string;
  notes?: string;
  groups?: string[]; // Array of group IDs
}

// ============================================
// DATABASE TYPES
// ============================================

export type ContactSyncStatus =
  | 'synced'
  | 'pending_create'
  | 'pending_update'
  | 'pending_delete'
  | 'error'
  | 'conflict';

export type ContactSource =
  | 'address_book'
  | 'domain'
  | 'inbox'
  | 'easemail';

export type ContactProvider = 'google' | 'microsoft';

export interface ContactV4 {
  id: string;
  userId: string;
  accountId: string;

  // Nylas integration
  nylasContactId: string | null;
  nylasGrantId: string;
  provider: ContactProvider;
  source: ContactSource;

  // Name fields
  givenName: string | null;
  middleName: string | null;
  surname: string | null;
  suffix: string | null;
  nickname: string | null;
  displayName: string; // Computed/generated

  // Contact information (JSONB)
  emails: NylasEmail[];
  phoneNumbers: NylasPhoneNumber[];
  physicalAddresses: NylasPhysicalAddress[];
  webPages: NylasWebPage[];
  imAddresses: NylasIMAddress[];

  // Professional
  jobTitle: string | null;
  companyName: string | null;
  managerName: string | null;
  officeLocation: string | null;
  department: string | null;

  // Personal
  birthday: Date | null;
  notes: string | null;

  // Picture
  pictureUrl: string | null;
  pictureData: Buffer | null;
  pictureUpdatedAt: Date | null;

  // Organization
  groups: NylasContactGroup[];
  tags: string[];

  // Metadata
  isFavorite: boolean;
  isDeleted: boolean;

  // Sync state
  syncStatus: ContactSyncStatus;
  syncError: string | null;
  lastSyncedAt: Date | null;

  // Versioning
  version: number;
  etag: string | null;
  localUpdatedAt: Date;
  remoteUpdatedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ContactSyncState {
  id: string;
  userId: string;
  accountId: string;

  // Sync tracking
  lastSuccessfulSync: Date | null;
  lastSyncAttempt: Date | null;
  nextSyncScheduled: Date | null;

  // Statistics
  totalContacts: number;
  syncedContacts: number;
  pendingContacts: number;
  errorContacts: number;
  conflictContacts: number;

  // Status
  syncStatus: 'idle' | 'syncing' | 'error' | 'paused';
  syncError: string | null;
  currentOperation: string | null;

  // Progress
  progressCurrent: number;
  progressTotal: number;
  progressPercentage: number;

  // Configuration
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  autoSync: boolean;

  // Cursor
  lastSyncCursor: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type SyncOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'sync'
  | 'conflict'
  | 'error';

export type SyncDirection =
  | 'local_to_remote'
  | 'remote_to_local'
  | 'bidirectional';

export type SyncLogStatus =
  | 'success'
  | 'error'
  | 'skipped'
  | 'pending';

export type SyncTrigger =
  | 'user'
  | 'scheduled_sync'
  | 'manual_sync'
  | 'webhook'
  | 'system';

export interface ContactSyncLog {
  id: string;
  userId: string;
  accountId: string;
  contactId: string | null;

  // Operation
  operation: SyncOperation;
  direction: SyncDirection;

  // Status
  status: SyncLogStatus;
  errorMessage: string | null;
  errorCode: string | null;

  // Changes
  changesMade: FieldChange[] | null;

  // Performance
  durationMs: number | null;

  // Context
  triggeredBy: SyncTrigger | null;

  // Timestamp
  createdAt: Date;
}

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export type ConflictType =
  | 'concurrent_edit'
  | 'delete_modified'
  | 'field_mismatch';

export type ResolutionStrategy =
  | 'keep_local'
  | 'keep_remote'
  | 'merge'
  | 'manual';

export type ConflictStatus =
  | 'pending'
  | 'resolved'
  | 'ignored'
  | 'auto_resolved';

export interface ContactConflict {
  id: string;
  userId: string;
  contactId: string;

  // Conflict data
  localVersion: Partial<ContactV4>;
  remoteVersion: Partial<NylasContact>;

  // Details
  conflictFields: string[];
  conflictReason: string | null;
  conflictType: ConflictType | null;

  // Resolution
  resolutionStrategy: ResolutionStrategy | null;
  resolvedVersion: Partial<ContactV4> | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;

  // Status
  status: ConflictStatus;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactGroup {
  id: string;
  userId: string;
  accountId: string;

  // Group details
  name: string;
  description: string | null;

  // Nylas integration
  nylasGroupId: string | null;
  groupType: 'system' | 'user';

  // UI
  color: string | null;
  icon: string | null;

  // Stats
  contactCount: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// UI/FRONTEND TYPES
// ============================================

export interface ContactListItem {
  id: string;
  account_id: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  job_title: string | null;
  company_name: string | null;
  picture_url: string | null;
  is_favorite: boolean;
  sync_status: ContactSyncStatus;
  groups: string[];
  tags: string[];
}

export interface ContactFormData {
  given_name: string;
  middle_name?: string;
  surname: string;
  suffix?: string;
  nickname?: string;

  emails: NylasEmail[];
  phone_numbers: NylasPhoneNumber[];
  physical_addresses: NylasPhysicalAddress[];
  web_pages: NylasWebPage[];
  im_addresses: NylasIMAddress[];

  job_title?: string;
  company_name?: string;
  manager_name?: string;
  office_location?: string;
  department?: string;

  birthday?: string;
  notes?: string;

  groups?: string[];
  tags?: string[];

  picture?: File;
}

export interface ContactSearchFilters {
  query?: string;
  account_id?: string;
  groups?: string[];
  tags?: string[];
  companies?: string[];
  is_favorite?: boolean;
  has_email?: boolean;
  has_phone?: boolean;
  source?: ContactSource;
}

export interface ContactSearchResult {
  contacts: ContactListItem[];
  total: number;
  has_more: boolean;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface GetContactsRequest {
  account_id?: string;
  source?: ContactSource;
  search?: string;
  groups?: string[];
  tags?: string[];
  is_favorite?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'name' | 'recent' | 'company';
  sort_order?: 'asc' | 'desc';
}

export interface GetContactsResponse {
  success: boolean;
  contacts: ContactListItem[];
  total: number;
  has_more: boolean;
  error?: string;
}

export interface CreateContactRequest {
  account_id: string;
  contact: ContactFormData;
  sync_immediately?: boolean;
}

export interface CreateContactResponse {
  success: boolean;
  contact: ContactV4;
  error?: string;
}

export interface UpdateContactRequest {
  contact_id: string;
  updates: Partial<ContactFormData>;
  sync_immediately?: boolean;
}

export interface UpdateContactResponse {
  success: boolean;
  contact: ContactV4;
  error?: string;
}

export interface DeleteContactRequest {
  contact_id: string;
  hard_delete?: boolean; // true = permanent, false = soft delete
}

export interface DeleteContactResponse {
  success: boolean;
  error?: string;
}

export interface SyncContactsRequest {
  account_id: string;
  force_full_sync?: boolean; // true = full sync, false = delta sync
  source?: ContactSource; // Which source to sync from
}

export interface SyncContactsResponse {
  success: boolean;
  total: number;
  imported: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: number;
  conflicts: number;
  duration_ms: number;
  error?: string;
}

export interface SyncProgressUpdate {
  type: 'start' | 'fetching' | 'processing' | 'progress' | 'complete' | 'error';
  status: string;
  total?: number;
  current?: number;
  percentage?: number;
  imported?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
  errors?: number;
  conflicts?: number;
  error?: string;
}

export interface GetSyncStateRequest {
  account_id: string;
}

export interface GetSyncStateResponse {
  success: boolean;
  sync_state: ContactSyncState;
  error?: string;
}

export interface ResolveConflictRequest {
  conflict_id: string;
  strategy: ResolutionStrategy;
  merged_data?: Partial<ContactFormData>; // If strategy is 'merge' or 'manual'
}

export interface ResolveConflictResponse {
  success: boolean;
  contact: ContactV4;
  error?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export interface PrimaryContact {
  email: string | null;
  phone: string | null;
}

export interface ContactStats {
  total_contacts: number;
  synced: number;
  pending: number;
  errors: number;
  conflicts: number;
  favorites: number;
  by_source: Record<ContactSource, number>;
  by_provider: Record<ContactProvider, number>;
}
