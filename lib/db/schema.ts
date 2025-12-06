import { pgTable, uuid, varchar, text, timestamp, boolean, integer, bigint, jsonb, index, serial, decimal, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// System Settings Table (for API keys and configuration)
export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Organizations Table
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  planType: varchar('plan_type', { length: 50 }).default('team'), // 'individual', 'team', 'enterprise'
  billingEmail: varchar('billing_email', { length: 255 }),
  maxSeats: integer('max_seats').default(5),
  currentSeats: integer('current_seats').default(1),
  isActive: boolean('is_active').default(true),
  
  // Account status fields (for billing suspension)
  accountStatus: varchar('account_status', { length: 50 }).default('active'),
  suspensionReason: text('suspension_reason'),
  suspendedAt: timestamp('suspended_at'),
  gracePeriodEndsAt: timestamp('grace_period_ends_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users Table (synced with Supabase Auth)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  role: varchar('role', { length: 50 }).default('individual').notNull(), // 'platform_admin', 'org_admin', 'org_user', 'individual'
  suspended: boolean('suspended').default(false), // Admin can suspend users
  
  // User management fields for admin-created users
  tempPassword: varchar('temp_password', { length: 255 }), // Encrypted temporary password
  requirePasswordChange: boolean('require_password_change').default(false), // Force password change on next login
  tempPasswordExpiresAt: timestamp('temp_password_expires_at'), // Temp password expiry (7 days)
  accountStatus: varchar('account_status', { length: 50 }).default('active'), // pending, active, suspended, deactivated, grace_period
  suspensionReason: text('suspension_reason'),
  suspendedAt: timestamp('suspended_at'),
  gracePeriodEndsAt: timestamp('grace_period_ends_at'),
  lastLoginAt: timestamp('last_login_at'), // Track last login time
  deactivatedAt: timestamp('deactivated_at'), // When account was deactivated (for 60-day deletion)
  createdBy: uuid('created_by').references((): any => users.id, { onDelete: 'set null' }), // Admin who created this user
  
  // Invitation fields (modern flow where user creates their own password)
  invitationToken: text('invitation_token'), // Secure token for invitation link
  invitationExpiresAt: timestamp('invitation_expires_at'), // Invitation expiry (7 days)
  invitationAcceptedAt: timestamp('invitation_accepted_at'), // When invitation was accepted
  invitedBy: uuid('invited_by').references((): any => users.id, { onDelete: 'set null' }), // Admin who invited this user
  
  // Onboarding fields
  onboardingCompleted: boolean('onboarding_completed').default(false), // Has user completed onboarding?
  onboardingStep: integer('onboarding_step').default(0), // Current step (0-7)
  onboardingSkipped: boolean('onboarding_skipped').default(false), // Did user skip onboarding?
  onboardingStartedAt: timestamp('onboarding_started_at'), // When onboarding was started
  onboardingCompletedAt: timestamp('onboarding_completed_at'), // When onboarding was completed
  
  // Billing & Promo fields
  isPromoUser: boolean('is_promo_user').default(false), // Promo users get free access without billing
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('free'), // 'free', 'starter', 'pro', 'enterprise'

  // Billing Address (for tax calculation)
  billingAddress: jsonb('billing_address').$type<{
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    province?: string;
    zipCode?: string;
    country?: string;
  }>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Audit Logs Table
export const userAuditLogs = pgTable('user_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: varchar('action', { length: 100 }).notNull(), // 'created', 'password_changed', 'suspended', 'deactivated', 'deleted', 'credentials_resent'
  performedBy: uuid('performed_by').references((): any => users.id, { onDelete: 'set null' }), // Admin who performed the action
  details: jsonb('details').$type<Record<string, any>>(), // Additional context
  ipAddress: varchar('ip_address', { length: 45 }), // IP address
  userAgent: text('user_agent'), // Browser/client info
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Password Reset Tokens Table (Custom flow via Resend)
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('idx_password_reset_tokens_token').on(table.token),
  userIdIdx: index('idx_password_reset_tokens_user_id').on(table.userId),
  expiresAtIdx: index('idx_password_reset_tokens_expires_at').on(table.expiresAt),
}));

// Email Accounts with Nylas/Aurinko support
export const emailAccounts = pgTable('email_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Provider info
  provider: varchar('provider', { length: 50 }).notNull(), // 'nylas', 'aurinko', 'imap', or 'jmap'
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  
  // Email details
  emailAddress: varchar('email_address', { length: 255 }).notNull(),
  emailProvider: varchar('email_provider', { length: 50 }), // 'gmail', 'outlook', 'imap', etc.
  
  // OAuth tokens (encrypted)
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiry: timestamp('token_expiry'),
  tokenExpiresAt: timestamp('token_expires_at'), // ✅ For proactive refresh
  refreshFailures: integer('refresh_failures').default(0), // ✅ Graceful degradation counter
  
  // Nylas specific
  nylasGrantId: varchar('nylas_grant_id', { length: 255 }),
  nylasEmail: varchar('nylas_email', { length: 255 }),
  nylasProvider: varchar('nylas_provider', { length: 50 }),
  nylasScopes: jsonb('nylas_scopes').$type<string[]>(),
  
  // Aurinko specific
  aurinkoAccountId: varchar('aurinko_account_id', { length: 255 }),
  aurinkoServiceType: varchar('aurinko_service_type', { length: 50 }),
  aurinkoUserId: varchar('aurinko_user_id', { length: 255 }),

  // Direct IMAP specific (for providers like Fastmail)
  imapHost: varchar('imap_host', { length: 255 }), // e.g., imap.fastmail.com
  imapPort: integer('imap_port').default(993), // Usually 993 for SSL/TLS
  imapUsername: varchar('imap_username', { length: 255 }), // Usually email address
  imapPassword: text('imap_password'), // Encrypted app-specific password
  imapTls: boolean('imap_tls').default(true), // Use TLS/SSL
  imapLastUid: integer('imap_last_uid').default(0), // Last synced UID for incremental sync

  // Sync status
  syncStatus: varchar('sync_status', { length: 50 }).default('idle'), // 'idle', 'syncing', 'completed', 'error', 'background_syncing'
  lastSyncedAt: timestamp('last_synced_at'),
  lastError: text('last_error'),
  syncCursor: text('sync_cursor'), // Nylas pagination token
  initialSyncCompleted: boolean('initial_sync_completed').default(false),
  totalEmailCount: integer('total_email_count').default(0),
  syncedEmailCount: integer('synced_email_count').default(0),
  syncProgress: integer('sync_progress').default(0), // 0-100 percentage
  syncStopped: boolean('sync_stopped').default(false), // Manual stop flag
  retryCount: integer('retry_count').default(0), // Auto-retry counter
  lastRetryAt: timestamp('last_retry_at'), // Last retry timestamp
  continuationCount: integer('continuation_count').default(0), // ✅ Tracks sync continuation jobs (prevents infinite loops)
  lastActivityAt: timestamp('last_activity_at'), // ✅ Last time sync made progress (detects silent failures)

  // Calendar & Contacts sync timestamps
  lastCalendarSyncAt: timestamp('last_calendar_sync_at'),
  lastContactSyncAt: timestamp('last_contact_sync_at'),
  
  // Webhooks
  webhookId: varchar('webhook_id', { length: 255 }),
  webhookStatus: varchar('webhook_status', { length: 50 }).default('inactive'),
  suppressWebhooks: boolean('suppress_webhooks').default(false), // Suppress webhooks during initial sync

  // Storage
  storageUsed: bigint('storage_used', { mode: 'number' }).default(0),
  storageLimit: bigint('storage_limit', { mode: 'number' }).default(5368709120),
  
  // Settings
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  autoSync: boolean('auto_sync').default(true),
  syncFrequency: integer('sync_frequency').default(5),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Emails (unified from both providers)
export const emails = pgTable('emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }).notNull(),
  
  // Provider references
  provider: varchar('provider', { length: 50 }).notNull(),
  providerMessageId: varchar('provider_message_id', { length: 255 }).notNull().unique(),
  
  // Email standard fields
  messageId: varchar('message_id', { length: 500 }),
  threadId: varchar('thread_id', { length: 255 }),
  providerThreadId: varchar('provider_thread_id', { length: 255 }),
  inReplyTo: varchar('in_reply_to', { length: 500 }),
  emailReferences: text('email_references'),
  
  // Folder/Labels
  folder: varchar('folder', { length: 255 }).default('inbox'),
  folders: jsonb('folders').$type<string[]>(),
  labels: jsonb('labels').$type<string[]>(),
  
  // Participants
  fromEmail: varchar('from_email', { length: 255 }),
  fromName: varchar('from_name', { length: 255 }),
  toEmails: jsonb('to_emails').$type<Array<{ email: string; name?: string }>>(),
  ccEmails: jsonb('cc_emails').$type<Array<{ email: string; name?: string }>>(),
  bccEmails: jsonb('bcc_emails').$type<Array<{ email: string; name?: string }>>(),
  replyTo: jsonb('reply_to').$type<Array<{ email: string; name?: string }>>(),
  
  // Content
  subject: text('subject'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  snippet: text('snippet'),
  
  // Metadata
  isRead: boolean('is_read').default(false),
  isStarred: boolean('is_starred').default(false),
  isFlagged: boolean('is_flagged').default(false),
  isArchived: boolean('is_archived').default(false),
  isTrashed: boolean('is_trashed').default(false),
  isDraft: boolean('is_draft').default(false),
  isSnoozed: boolean('is_snoozed').default(false),
  snoozeUntil: timestamp('snooze_until'),
  
  // Attachments
  hasAttachments: boolean('has_attachments').default(false),
  attachmentsCount: integer('attachments_count').default(0),
  attachments: jsonb('attachments').$type<Array<{
    id: string;
    filename: string;
    size: number;
    contentType: string;
    contentId?: string;
    url?: string;
    providerFileId?: string;
  }>>(),
  
  // Priority & Security
  priority: varchar('priority', { length: 20 }).default('normal'),
  sensitivity: varchar('sensitivity', { length: 20 }),
  
  // AI Features
  aiSummary: text('ai_summary'),
  aiSentiment: varchar('ai_sentiment', { length: 50 }),
  aiCategory: varchar('ai_category', { length: 100 }),
  aiActionItems: jsonb('ai_action_items').$type<string[]>(),
  
  // Provider metadata
  providerData: jsonb('provider_data').$type<Record<string, any>>(),
  
  // Timestamps
  receivedAt: timestamp('received_at'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for common query patterns
  // Composite indexes for most common queries (account + date sorting)
  accountIdReceivedAtIdx: index('emails_account_received_idx').on(table.accountId, table.receivedAt),
  accountIdSentAtIdx: index('emails_account_sent_idx').on(table.accountId, table.sentAt),

  // Folder filtering (used in every folder view)
  accountIdFolderIdx: index('emails_account_folder_idx').on(table.accountId, table.folder),

  // Thread grouping
  threadIdIdx: index('emails_thread_id_idx').on(table.threadId),

  // Search optimization
  fromEmailIdx: index('emails_from_email_idx').on(table.fromEmail),
  subjectIdx: index('emails_subject_idx').on(table.subject),

  // Boolean filters for common views
  isStarredIdx: index('emails_starred_idx').on(table.accountId, table.isStarred),
  isTrashedIdx: index('emails_trashed_idx').on(table.accountId, table.isTrashed),
  isReadIdx: index('emails_read_idx').on(table.accountId, table.isRead),
}));

// Attachments (extracted from emails)
export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailId: uuid('email_id').references(() => emails.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),
  
  // File details
  filename: varchar('filename', { length: 500 }).notNull(),
  fileExtension: varchar('file_extension', { length: 50 }),
  mimeType: varchar('mime_type', { length: 255 }),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),

  // Nylas attachment IDs (for on-demand fetching)
  nylasAttachmentId: varchar('nylas_attachment_id', { length: 255 }).notNull(),
  nylasMessageId: varchar('nylas_message_id', { length: 255 }).notNull(),
  nylasGrantId: varchar('nylas_grant_id', { length: 255 }).notNull(),

  // Legacy storage fields (optional, for backwards compatibility)
  storagePath: varchar('storage_path', { length: 1000 }),
  storageUrl: text('storage_url'),
  thumbnailPath: varchar('thumbnail_path', { length: 1000 }),
  thumbnailUrl: text('thumbnail_url'),
  
  // Email context
  emailSubject: text('email_subject'),
  senderEmail: varchar('sender_email', { length: 255 }),
  senderName: varchar('sender_name', { length: 255 }),
  emailDate: timestamp('email_date'),
  threadId: uuid('thread_id'),
  
  // AI Classification
  documentType: varchar('document_type', { length: 100 }), // 'invoice', 'receipt', 'contract', 'report', 'image', etc.
  classificationConfidence: integer('classification_confidence'), // 0-100
  extractedMetadata: jsonb('extracted_metadata').$type<Record<string, any>>(), // AI-extracted data
  keyTerms: jsonb('key_terms').$type<string[]>(),

  // Inline image flag (embedded in email body via cid: references)
  isInline: boolean('is_inline').default(false),
  contentId: varchar('content_id', { length: 255 }), // CID for inline images

  // Processing status
  aiProcessed: boolean('ai_processed').default(false),
  processingStatus: varchar('processing_status', { length: 50 }).default('pending'), // 'pending', 'processing', 'completed', 'failed'
  processingError: text('processing_error'),
  processedAt: timestamp('processed_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('attachments_user_id_idx').on(table.userId),
  emailIdIdx: index('attachments_email_id_idx').on(table.emailId),
  fileExtensionIdx: index('attachments_file_extension_idx').on(table.fileExtension),
  documentTypeIdx: index('attachments_document_type_idx').on(table.documentType),
  emailDateIdx: index('attachments_email_date_idx').on(table.emailDate),
}));

// Contacts
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Provider info
  provider: varchar('provider', { length: 50 }),
  providerContactId: varchar('provider_contact_id', { length: 255 }),
  
  // Basic info (at least one of email or phone is required via DB constraint)
  email: varchar('email', { length: 255 }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  fullName: varchar('full_name', { length: 255 }),
  displayName: varchar('display_name', { length: 255 }),
  
  // Professional info
  company: varchar('company', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  department: varchar('department', { length: 255 }),
  
  // Contact details
  phone: varchar('phone', { length: 50 }),
  phoneNumbers: jsonb('phone_numbers').$type<Array<{ type: string; number: string }>>(),
  addresses: jsonb('addresses').$type<Array<{ 
    type: string; 
    street?: string; 
    city?: string; 
    state?: string; 
    zip?: string; 
    country?: string; 
  }>>(),
  
  // Online presence
  location: varchar('location', { length: 255 }),
  website: varchar('website', { length: 500 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  twitterHandle: varchar('twitter_handle', { length: 100 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  
  // Organization
  tags: jsonb('tags').$type<string[]>().default([]),
  groups: jsonb('groups').$type<string[]>().default([]),
  
  // Notes & custom fields
  notes: text('notes'),
  customFields: jsonb('custom_fields').$type<Record<string, any>>().default({}),
  
  // Engagement metrics
  emailCount: integer('email_count').default(0),
  lastEmailAt: timestamp('last_email_at'),
  firstEmailAt: timestamp('first_email_at'),
  lastContactedAt: timestamp('last_contacted_at'),
  
  // AI insights
  aiInsights: jsonb('ai_insights').$type<{
    relationship?: string;
    importance?: number;
    topics?: string[];
    sentiment?: string;
  }>(),
  
  // Provider metadata
  providerData: jsonb('provider_data').$type<Record<string, any>>(),
  
  // Status
  isFavorite: boolean('is_favorite').default(false),
  isBlocked: boolean('is_blocked').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contact Sync Status (track sync state per account)
export const contactSyncStatus = pgTable('contact_sync_status', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailAccountId: uuid('email_account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),

  provider: varchar('provider', { length: 50 }).notNull(), // 'nylas', 'google', 'microsoft'
  nylasGrantId: varchar('nylas_grant_id', { length: 255 }),

  // Sync tracking
  syncEnabled: boolean('sync_enabled').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  lastSuccessfulSyncAt: timestamp('last_successful_sync_at'),
  nextSyncAt: timestamp('next_sync_at'),

  // Sync statistics
  syncStatus: varchar('sync_status', { length: 50 }).default('idle'), // 'idle', 'syncing', 'success', 'error'
  syncError: text('sync_error'),
  totalContactsSynced: integer('total_contacts_synced').default(0),
  contactsAdded: integer('contacts_added').default(0),
  contactsUpdated: integer('contacts_updated').default(0),
  contactsSkipped: integer('contacts_skipped').default(0),

  // Pagination tokens for incremental sync
  syncToken: text('sync_token'),
  pageToken: text('page_token'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('contact_sync_user_id_idx').on(table.userId),
  accountIdIdx: index('contact_sync_account_id_idx').on(table.emailAccountId),
  grantIdIdx: index('contact_sync_grant_id_idx').on(table.nylasGrantId),
  providerIdx: index('contact_sync_provider_idx').on(table.provider),
}));

// Labels
export const labels = pgTable('labels', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).default('#4ecdc4'),
  icon: varchar('icon', { length: 50 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Email Labels (Many-to-Many)
export const emailLabels = pgTable('email_labels', {
  emailId: uuid('email_id').references(() => emails.id, { onDelete: 'cascade' }).notNull(),
  labelId: uuid('label_id').references(() => labels.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Email Signatures
export const emailSignatures = pgTable('email_signatures', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  contentHtml: text('content_html').notNull(),
  contentText: text('content_text'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  useForReplies: boolean('use_for_replies').default(true),
  useForForwards: boolean('use_for_forwards').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Preferences
export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  
  // Appearance
  theme: varchar('theme', { length: 20 }).default('dark'),
  language: varchar('language', { length: 10 }).default('en'),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  dateFormat: varchar('date_format', { length: 20 }).default('MM/DD/YYYY'),
  timeFormat: varchar('time_format', { length: 10 }).default('12h'),
  
  // Email display
  emailDensity: varchar('email_density', { length: 20 }).default('comfortable'),
  emailsPerPage: integer('emails_per_page').default(50),
  showAvatars: boolean('show_avatars').default(true),
  showSnippets: boolean('show_snippets').default(true),
  showAISummaries: boolean('show_ai_summaries').default(true),
  
  // Reading
  autoAdvance: boolean('auto_advance').default(true),
  conversationView: boolean('conversation_view').default(true),
  showImages: boolean('show_images').default(false),
  markAsReadOnView: boolean('mark_as_read_on_view').default(true),
  
  // Composing
  smartCompose: boolean('smart_compose').default(true),
  defaultReplyBehavior: varchar('default_reply_behavior', { length: 20 }).default('reply'),
  autoSaveDrafts: boolean('auto_save_drafts').default(true),
  hideSignaturePrompt: boolean('hide_signature_prompt').default(false),
  
  // Notifications
  notificationsEnabled: boolean('notifications_enabled').default(true),
  desktopNotifications: boolean('desktop_notifications').default(true),
  soundEnabled: boolean('sound_enabled').default(true),
  
  // AI Features
  aiEnabled: boolean('ai_enabled').default(true),
  aiAutoSummarize: boolean('ai_auto_summarize').default(true),
  aiAttachmentProcessing: boolean('ai_attachment_processing').default(false), // Default OFF for security

  // Writing Style Learning
  emailWritingStyle: text('email_writing_style'), // AI-generated style profile
  emailStyleLearnedAt: timestamp('email_style_learned_at'), // When style was last learned
  usePersonalStyle: boolean('use_personal_style').default(true), // Toggle for using learned style

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// AI Chat Messages
export const aiChatMessages = pgTable('ai_chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  sessionId: uuid('session_id').notNull(),
  emailId: uuid('email_id').references(() => emails.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    model?: string;
    tokens?: number;
    context?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Email Drafts
export const emailDrafts = pgTable('email_drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }).notNull(),
  
  // Provider draft ID
  provider: varchar('provider', { length: 50 }),
  providerDraftId: varchar('provider_draft_id', { length: 255 }),
  
  // Reply/Forward context
  replyToEmailId: uuid('reply_to_email_id').references(() => emails.id, { onDelete: 'set null' }),
  replyType: varchar('reply_type', { length: 20 }),
  
  // Recipients
  toRecipients: jsonb('to_recipients').$type<Array<{ email: string; name?: string }>>().notNull(),
  cc: jsonb('cc').$type<Array<{ email: string; name?: string }>>(),
  bcc: jsonb('bcc').$type<Array<{ email: string; name?: string }>>(),
  
  // Content
  subject: text('subject'),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  
  // Attachments
  attachments: jsonb('attachments').$type<Array<{
    filename: string;
    size: number;
    contentType: string;
    url: string;
    providerFileId?: string;
  }>>(),
  
  // Scheduling
  scheduledAt: timestamp('scheduled_at'),
  
  // AI features
  aiGenerated: boolean('ai_generated').default(false),
  aiPrompt: text('ai_prompt'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Email Templates (for compose - personal/org templates)
export const userEmailTemplates = pgTable('user_email_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  
  // Template metadata
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }), // sales, support, personal, marketing, etc.
  
  // Template content
  subject: text('subject'),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  
  // Variables used in template (for UI hints)
  variables: jsonb('variables').$type<string[]>(), // Array of variable names like ["{{name}}", "{{company}}"]
  
  // Usage tracking
  timesUsed: integer('times_used').default(0),
  lastUsedAt: timestamp('last_used_at'),
  
  // Sharing (for org templates)
  isShared: boolean('is_shared').default(false), // Can other org members use this?
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_email_templates_user_id_idx').on(table.userId),
  organizationIdIdx: index('user_email_templates_organization_id_idx').on(table.organizationId),
  categoryIdx: index('user_email_templates_category_idx').on(table.category),
  isSharedIdx: index('user_email_templates_is_shared_idx').on(table.isShared),
  timesUsedIdx: index('user_email_templates_times_used_idx').on(table.timesUsed),
}));

// Webhook Logs
export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  eventType: varchar('event_type', { length: 100 }),
  payload: jsonb('payload').$type<Record<string, any>>(),
  status: varchar('status', { length: 50 }),
  errorMessage: text('error_message'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Email Folders (for two-way sync)
export const emailFolders = pgTable('email_folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }).notNull(),
  nylasFolderId: varchar('nylas_folder_id', { length: 255 }).notNull(),
  parentFolderId: uuid('parent_folder_id'),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  fullPath: text('full_path'),
  folderType: varchar('folder_type', { length: 50 }), // 'inbox', 'sent', 'drafts', 'trash', 'spam', 'custom'
  unreadCount: integer('unread_count').default(0),
  totalCount: integer('total_count').default(0),
  syncEnabled: boolean('sync_enabled').default(true),
  lastSyncedAt: timestamp('last_synced_at'),
  providerAttributes: jsonb('provider_attributes').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sync Logs (monitoring)
export const syncLogs = pgTable('sync_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }).notNull(),
  syncType: varchar('sync_type', { length: 50 }), // 'full', 'delta', 'webhook'
  status: varchar('status', { length: 50 }), // 'started', 'completed', 'failed'
  messagesSynced: integer('messages_synced').default(0),
  errorMessage: text('error_message'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

// Webhook Events Queue
export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),
  nylasWebhookId: varchar('nylas_webhook_id', { length: 255 }),
  eventType: varchar('event_type', { length: 100 }), // 'message.created', 'message.updated', etc.
  payload: jsonb('payload').$type<Record<string, any>>(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// SMS SYSTEM
// ============================================================================

// SMS Messages
export const smsMessages = pgTable('sms_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  
  // Message details
  toPhone: varchar('to_phone', { length: 50 }).notNull(),
  fromPhone: varchar('from_phone', { length: 50 }).notNull(),
  messageBody: text('message_body').notNull(),
  
  // Twilio info
  twilioSid: varchar('twilio_sid', { length: 255 }),
  twilioStatus: varchar('twilio_status', { length: 50 }),
  twilioErrorCode: varchar('twilio_error_code', { length: 50 }),
  twilioErrorMessage: text('twilio_error_message'),
  
  // Billing
  costUsd: varchar('cost_usd', { length: 20 }),
  priceChargedUsd: varchar('price_charged_usd', { length: 20 }),
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Metadata
  direction: varchar('direction', { length: 20 }).default('outbound'),
  isRead: boolean('is_read').default(false),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sms_messages_user_id_idx').on(table.userId),
  contactIdIdx: index('sms_messages_contact_id_idx').on(table.contactId),
  twilioSidIdx: index('sms_messages_twilio_sid_idx').on(table.twilioSid),
  createdAtIdx: index('sms_messages_created_at_idx').on(table.createdAt),
}));

// SMS Conversation Tracking (for routing inbound SMS to correct user)
export const smsConversations = pgTable('sms_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  
  // Phone number mapping
  contactPhone: varchar('contact_phone', { length: 50 }).notNull(),
  twilioNumber: varchar('twilio_number', { length: 50 }).notNull(),
  
  // Tracking
  lastMessageAt: timestamp('last_message_at').notNull(),
  messageCount: integer('message_count').default(1),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sms_conv_user_id_idx').on(table.userId),
  contactIdIdx: index('sms_conv_contact_id_idx').on(table.contactId),
  phoneIdx: index('sms_conv_phone_idx').on(table.contactPhone),
  twilioIdx: index('sms_conv_twilio_idx').on(table.twilioNumber),
  // Unique constraint: one active conversation per phone pair
  uniqueConversation: unique('sms_conv_unique').on(table.contactPhone, table.twilioNumber),
}));

// SMS Usage Tracking
export const smsUsage = pgTable('sms_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  totalMessagesSent: integer('total_messages_sent').default(0),
  messageCount: integer('message_count').default(0), // Alias for compatibility
  totalCostUsd: varchar('total_cost_usd', { length: 20 }).default('0'),
  cost: decimal('cost', { precision: 10, scale: 4 }).default('0'), // Alias for compatibility
  totalChargedUsd: varchar('total_charged_usd', { length: 20 }).default('0'),

  billingStatus: varchar('billing_status', { length: 50 }).default('pending'),
  invoiceId: varchar('invoice_id', { length: 255 }),

  // Billing tracking
  chargedAt: timestamp('charged_at'),
  chargeAmountUsd: decimal('charge_amount_usd', { precision: 10, scale: 2 }),
  transactionId: uuid('transaction_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sms_usage_user_id_idx').on(table.userId),
  periodIdx: index('sms_usage_period_idx').on(table.periodStart, table.periodEnd),
}));

// Contact Communications Timeline
export const contactCommunications = pgTable('contact_communications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  
  // Communication type (NO EMAILS - only SMS, calls, notes)
  type: varchar('type', { length: 50 }).notNull(), // 'sms_sent', 'sms_received', 'call_inbound', 'call_outbound', 'note'
  direction: varchar('direction', { length: 20 }), // 'inbound', 'outbound', 'internal'
  
  // Content
  subject: text('subject'),
  body: text('body'),
  snippet: text('snippet'),
  
  // References
  smsId: uuid('sms_id').references(() => smsMessages.id, { onDelete: 'set null' }),
  
  // Metadata
  metadata: jsonb('metadata').$type<{
    cost?: number;
    segments?: number;
    encoding?: string;
    country?: string;
    provider?: string;
    [key: string]: any;
  }>(),
  
  // Status
  status: varchar('status', { length: 50 }),
  
  // Timestamps
  occurredAt: timestamp('occurred_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  contactIdIdx: index('contact_comms_contact_id_idx').on(table.contactId),
  userIdIdx: index('contact_comms_user_id_idx').on(table.userId),
  typeIdx: index('contact_comms_type_idx').on(table.type),
  occurredAtIdx: index('contact_comms_occurred_at_idx').on(table.occurredAt),
}));

// Contact Notes
export const contactNotes = pgTable('contact_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  
  noteText: text('note_text').notNull(), // Fixed: was 'content', but API uses 'note_text'
  category: varchar('category', { length: 50 }),
  isPinned: boolean('is_pinned').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  contactIdIdx: index('contact_notes_contact_id_idx').on(table.contactId),
  userIdIdx: index('contact_notes_user_id_idx').on(table.userId),
  createdAtIdx: index('contact_notes_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// CALENDAR SYSTEM
// ============================================================================

// Calendar Events
export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Event Details
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  location: text('location'),
  
  // Time
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  allDay: boolean('all_day').default(false),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  
  // Recurrence
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: text('recurrence_rule'),
  recurrenceEndDate: timestamp('recurrence_end_date'),
  parentEventId: uuid('parent_event_id'),
  
  // Organization
  calendarType: varchar('calendar_type', { length: 50 }).default('personal'),
  color: varchar('color', { length: 20 }).default('blue'),
  category: varchar('category', { length: 50 }),
  
  // Participants
  organizerEmail: varchar('organizer_email', { length: 255 }),
  attendees: jsonb('attendees').$type<Array<{
    email: string;
    name?: string;
    status: 'accepted' | 'declined' | 'maybe' | 'pending';
  }>>(),
  
  // Reminders
  reminders: jsonb('reminders').$type<Array<{
    type: 'email' | 'sms' | 'popup';
    minutesBefore: number;
  }>>(),
  
  // Google Calendar Sync
  googleEventId: varchar('google_event_id', { length: 255 }),
  googleCalendarId: varchar('google_calendar_id', { length: 255 }),
  googleSyncStatus: varchar('google_sync_status', { length: 50 }),
  googleLastSyncedAt: timestamp('google_last_synced_at'),
  
  // Microsoft Calendar Sync
  microsoftEventId: varchar('microsoft_event_id', { length: 255 }),
  microsoftCalendarId: varchar('microsoft_calendar_id', { length: 255 }),
  microsoftSyncStatus: varchar('microsoft_sync_status', { length: 50 }),
  microsoftLastSyncedAt: timestamp('microsoft_last_synced_at'),
  
  // Metadata
  isPrivate: boolean('is_private').default(false),
  status: varchar('status', { length: 50 }).default('confirmed'),
  metadata: jsonb('metadata'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('calendar_events_user_id_idx').on(table.userId),
  startTimeIdx: index('calendar_events_start_time_idx').on(table.startTime),
  endTimeIdx: index('calendar_events_end_time_idx').on(table.endTime),
  googleIdIdx: index('calendar_events_google_id_idx').on(table.googleEventId),
  microsoftIdIdx: index('calendar_events_microsoft_id_idx').on(table.microsoftEventId),
  statusIdx: index('calendar_events_status_idx').on(table.status),
  parentIdIdx: index('calendar_events_parent_id_idx').on(table.parentEventId),
}));

// Calendars (metadata for synced calendars)
export const calendars = pgTable('calendars', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailAccountId: uuid('email_account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),

  // Provider info
  provider: varchar('provider', { length: 50 }).notNull(), // 'google', 'microsoft', 'nylas', etc.
  providerCalendarId: varchar('provider_calendar_id', { length: 255 }).notNull(),
  nylasGrantId: varchar('nylas_grant_id', { length: 255 }),

  // Calendar details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  timezone: varchar('timezone', { length: 100 }).default('UTC'),

  // Display settings
  color: varchar('color', { length: 20 }).default('blue'),
  isVisible: boolean('is_visible').default(true),
  isPrimary: boolean('is_primary').default(false),

  // Permissions
  isReadOnly: boolean('is_read_only').default(false),
  isOwned: boolean('is_owned').default(false),

  // Sync settings
  syncEnabled: boolean('sync_enabled').default(true),
  lastSyncedAt: timestamp('last_synced_at'),
  syncStatus: varchar('sync_status', { length: 50 }).default('idle'),
  syncError: text('sync_error'),

  // Provider-specific metadata
  providerData: jsonb('provider_data').$type<Record<string, any>>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('calendars_user_id_idx').on(table.userId),
  accountIdIdx: index('calendars_account_id_idx').on(table.emailAccountId),
  providerIdIdx: index('calendars_provider_id_idx').on(table.providerCalendarId),
  grantIdIdx: index('calendars_grant_id_idx').on(table.nylasGrantId),
  providerIdx: index('calendars_provider_idx').on(table.provider),
}));

// Calendar Sync State
export const calendarSyncState = pgTable('calendar_sync_state', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailAccountId: uuid('email_account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),

  provider: varchar('provider', { length: 50 }).notNull(),
  calendarId: varchar('calendar_id', { length: 255 }),

  // Sync timing
  lastSyncAt: timestamp('last_sync_at'),
  lastSuccessfulSync: timestamp('last_successful_sync'),
  lastSyncAttempt: timestamp('last_sync_attempt'),

  // Pagination tokens
  syncToken: text('sync_token'), // For Google/Microsoft delta sync
  pageToken: text('page_token'), // For legacy pagination
  lastSyncCursor: text('last_sync_cursor'), // For Nylas cursor-based pagination

  // Sync status
  syncStatus: varchar('sync_status', { length: 50 }).default('idle'), // 'idle', 'syncing', 'error', 'paused'
  lastError: text('last_error'),

  // Statistics (matching contacts-v4)
  totalEvents: integer('total_events').default(0),
  syncedEvents: integer('synced_events').default(0),
  pendingEvents: integer('pending_events').default(0),
  errorEvents: integer('error_events').default(0),

  // Progress tracking (matching contacts-v4)
  progressCurrent: integer('progress_current').default(0),
  progressTotal: integer('progress_total').default(0),
  progressPercentage: integer('progress_percentage').default(0),
  currentOperation: varchar('current_operation', { length: 255 }),

  // Configuration
  syncEnabled: boolean('sync_enabled').default(true),
  autoSync: boolean('auto_sync').default(true),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('calendar_sync_user_id_idx').on(table.userId),
  accountIdIdx: index('calendar_sync_account_id_idx').on(table.emailAccountId),
  providerIdx: index('calendar_sync_provider_idx').on(table.provider),
}));

// SMS Audit Log (for billing & compliance)
export const smsAuditLog = pgTable('sms_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  smsId: uuid('sms_id').references(() => smsMessages.id, { onDelete: 'set null' }),
  
  action: varchar('action', { length: 50 }).notNull(), // 'sent', 'failed', 'delivered', 'refunded', 'billed'
  amountCharged: varchar('amount_charged', { length: 20 }),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_user_id_idx').on(table.userId),
  smsIdIdx: index('audit_sms_id_idx').on(table.smsId),
  createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
}));

// Organization Members (Junction Table)
export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 50 }).notNull(), // 'owner', 'admin', 'member'
  invitedBy: uuid('invited_by').references(() => users.id),
  invitedAt: timestamp('invited_at').defaultNow(),
  joinedAt: timestamp('joined_at'),
  isActive: boolean('is_active').default(true),
  permissions: jsonb('permissions').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('org_members_org_id_idx').on(table.organizationId),
  userIdIdx: index('org_members_user_id_idx').on(table.userId),
}));

// Subscriptions
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }), // Alias for compatibility
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  planName: varchar('plan_name', { length: 50 }).notNull(),
  planId: varchar('plan_id', { length: 50 }), // For Stripe: 'free', 'individual', 'team', 'enterprise'
  billingCycle: varchar('billing_cycle', { length: 20 }).default('monthly'),
  pricePerMonth: decimal('price_per_month', { precision: 10, scale: 2 }),
  seatsIncluded: integer('seats_included').default(1),
  seats: integer('seats').default(1), // Alias for compatibility
  seatsUsed: integer('seats_used').default(1),
  status: varchar('status', { length: 50 }).default('active'),
  trialEndsAt: timestamp('trial_ends_at'),
  trialEnd: timestamp('trial_end'), // Alias for Stripe compatibility
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('subscriptions_org_id_idx').on(table.organizationId),
  userIdIdx: index('subscriptions_user_id_idx').on(table.userId),
  stripeSubIdIdx: index('subscriptions_stripe_sub_id_idx').on(table.stripeSubscriptionId),
}));

// Team Invitations
export const teamInvitations = pgTable('team_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('invitations_org_id_idx').on(table.organizationId),
  tokenIdx: index('invitations_token_idx').on(table.token),
  emailIdx: index('invitations_email_idx').on(table.email),
}));

// Invoices
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').references(() => organizations.id, { onDelete: 'cascade' }), // Alias for compatibility
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),

  invoiceNumber: varchar('invoice_number', { length: 50 }).unique(),
  amountUsd: decimal('amount_usd', { precision: 10, scale: 2 }),
  amount: decimal('amount', { precision: 10, scale: 2 }), // Alias for compatibility
  taxAmountUsd: decimal('tax_amount_usd', { precision: 10, scale: 2 }).default('0'),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0'), // Alias for compatibility
  totalUsd: decimal('total_usd', { precision: 10, scale: 2 }),
  total: decimal('total', { precision: 10, scale: 2 }), // Alias for compatibility
  currency: varchar('currency', { length: 3 }).default('USD'),

  status: varchar('status', { length: 50 }).default('draft'),
  dueDate: timestamp('due_date'),
  paidAt: timestamp('paid_at'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),

  lineItems: jsonb('line_items').$type<Array<{description: string; quantity: number; unitPrice: number; total: number}>>(),
  paymentMethod: varchar('payment_method', { length: 255 }),

  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).unique(),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),

  pdfUrl: varchar('pdf_url', { length: 500 }),
  invoiceUrl: varchar('invoice_url', { length: 500 }), // Stripe hosted invoice URL
  invoicePdfUrl: varchar('invoice_pdf_url', { length: 500 }), // Alias for pdfUrl
  notes: text('notes'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  orgIdIdx: index('invoices_org_id_idx').on(table.organizationId),
  userIdIdx: index('invoices_user_id_idx').on(table.userId),
  statusIdx: index('invoices_status_idx').on(table.status),
  periodIdx: index('invoices_period_idx').on(table.periodStart, table.periodEnd),
  stripeInvoiceIdIdx: index('invoices_stripe_invoice_id_idx').on(table.stripeInvoiceId),
}));

// Payment Methods
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  
  type: varchar('type', { length: 50 }).notNull(),
  isDefault: boolean('is_default').default(false),
  
  lastFour: varchar('last_four', { length: 4 }),
  brand: varchar('brand', { length: 50 }),
  expiryMonth: integer('expiry_month'),
  expiryYear: integer('expiry_year'),
  
  billingName: varchar('billing_name', { length: 255 }),
  billingEmail: varchar('billing_email', { length: 255 }),
  billingAddress: jsonb('billing_address').$type<{street?: string; city?: string; state?: string; zip?: string; country?: string}>(),
  
  stripePaymentMethodId: varchar('stripe_payment_method_id', { length: 255 }).unique(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  
  status: varchar('status', { length: 50 }).default('active'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('payment_methods_user_id_idx').on(table.userId),
  orgIdIdx: index('payment_methods_org_id_idx').on(table.organizationId),
  defaultIdx: index('payment_methods_default_idx').on(table.isDefault),
}));

// AI Usage
export const aiUsage = pgTable('ai_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),

  feature: varchar('feature', { length: 50 }).notNull(),
  requestCount: integer('request_count').default(0),

  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 2 }).default('0'),
  cost: decimal('cost', { precision: 10, scale: 4 }).default('0'), // Alias for compatibility
  includedRequests: integer('included_requests').default(0),
  overageRequests: integer('overage_requests').default(0),

  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Billing tracking
  chargedAt: timestamp('charged_at'),
  chargeAmountUsd: decimal('charge_amount_usd', { precision: 10, scale: 2 }),
  transactionId: uuid('transaction_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_usage_user_id_idx').on(table.userId),
  orgIdIdx: index('ai_usage_org_id_idx').on(table.organizationId),
  featureIdx: index('ai_usage_feature_idx').on(table.feature),
  periodIdx: index('ai_usage_period_idx').on(table.periodStart, table.periodEnd),
}));

// Storage Usage
export const storageUsage = pgTable('storage_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),

  totalBytes: bigint('total_bytes', { mode: 'number' }).default(0),
  storageUsed: bigint('storage_used', { mode: 'number' }).default(0), // Alias for totalBytes
  attachmentsBytes: bigint('attachments_bytes', { mode: 'number' }).default(0),
  emailsBytes: bigint('emails_bytes', { mode: 'number' }).default(0),
  otherBytes: bigint('other_bytes', { mode: 'number' }).default(0),

  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),

  includedGb: decimal('included_gb', { precision: 10, scale: 2 }).default('50'),
  overageGb: decimal('overage_gb', { precision: 10, scale: 2 }).default('0'),
  overageCostUsd: decimal('overage_cost_usd', { precision: 10, scale: 2 }).default('0'),
  cost: decimal('cost', { precision: 10, scale: 4 }).default('0'), // Alias for compatibility

  snapshotDate: timestamp('snapshot_date').defaultNow(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('storage_usage_user_id_idx').on(table.userId),
  orgIdIdx: index('storage_usage_org_id_idx').on(table.organizationId),
  periodIdx: index('storage_usage_period_idx').on(table.periodStart, table.periodEnd),
}));

// Usage Alerts
export const usageAlerts = pgTable('usage_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  thresholdValue: decimal('threshold_value', { precision: 10, scale: 2 }).notNull(),
  thresholdUnit: varchar('threshold_unit', { length: 50 }),
  
  currentValue: decimal('current_value', { precision: 10, scale: 2 }).default('0'),
  percentageUsed: decimal('percentage_used', { precision: 5, scale: 2 }).default('0'),
  
  isActive: boolean('is_active').default(true),
  triggeredAt: timestamp('triggered_at'),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgedBy: uuid('acknowledged_by').references(() => users.id),
  
  notifyEmail: boolean('notify_email').default(true),
  notifyInApp: boolean('notify_in_app').default(true),
  notificationSentAt: timestamp('notification_sent_at'),
  
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('usage_alerts_user_id_idx').on(table.userId),
  orgIdIdx: index('usage_alerts_org_id_idx').on(table.organizationId),
  typeIdx: index('usage_alerts_type_idx').on(table.alertType),
  activeIdx: index('usage_alerts_active_idx').on(table.isActive),
}));

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: uuid('resource_id'),
  
  oldValue: jsonb('old_value').$type<Record<string, any>>(),
  newValue: jsonb('new_value').$type<Record<string, any>>(),
  
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  orgIdIdx: index('audit_logs_org_id_idx').on(table.organizationId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
}));

// Billing Configuration
export const billingConfig = pgTable('billing_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  enabled: boolean('enabled').default(false),
  frequency: varchar('frequency', { length: 20 }).default('monthly'),
  dayOfWeek: integer('day_of_week'),
  dayOfMonth: integer('day_of_month'),
  hourOfDay: integer('hour_of_day').default(2),
  
  autoRetry: boolean('auto_retry').default(true),
  maxRetries: integer('max_retries').default(3),
  retryDelayHours: integer('retry_delay_hours').default(24),
  
  notifyOnSuccess: boolean('notify_on_success').default(false),
  notifyOnFailure: boolean('notify_on_failure').default(true),
  notificationEmail: varchar('notification_email', { length: 255 }),
  
  smsChargeThresholdUsd: decimal('sms_charge_threshold_usd', { precision: 10, scale: 2 }).default('1.00'),
  aiChargeThresholdUsd: decimal('ai_charge_threshold_usd', { precision: 10, scale: 2 }).default('5.00'),
  minimumChargeUsd: decimal('minimum_charge_usd', { precision: 10, scale: 2 }).default('0.50'),
  
  gracePeriodDays: integer('grace_period_days').default(3),
  
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  lastRunStatus: varchar('last_run_status', { length: 50 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Billing Runs
export const billingRuns = pgTable('billing_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  status: varchar('status', { length: 50 }).default('running'),
  
  accountsProcessed: integer('accounts_processed').default(0),
  chargesSuccessful: integer('charges_successful').default(0),
  chargesFailed: integer('charges_failed').default(0),
  totalAmountChargedUsd: decimal('total_amount_charged_usd', { precision: 10, scale: 2 }).default('0'),
  
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  configSnapshot: jsonb('config_snapshot').$type<Record<string, any>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  startedIdx: index('billing_runs_started_idx').on(table.startedAt),
  statusIdx: index('billing_runs_status_idx').on(table.status),
}));

// Billing Transactions
export const billingTransactions = pgTable('billing_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  
  transactionType: varchar('transaction_type', { length: 50 }).notNull(),
  amountUsd: decimal('amount_usd', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  
  billingRunId: uuid('billing_run_id').references(() => billingRuns.id, { onDelete: 'set null' }),
  invoiceId: uuid('invoice_id').references(() => invoices.id, { onDelete: 'set null' }),
  
  status: varchar('status', { length: 50 }).default('pending'),
  paymentMethodId: uuid('payment_method_id').references(() => paymentMethods.id, { onDelete: 'set null' }),
  
  stripeChargeId: varchar('stripe_charge_id', { length: 255 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  
  retryCount: integer('retry_count').default(0),
  lastRetryAt: timestamp('last_retry_at'),
  nextRetryAt: timestamp('next_retry_at'),
  
  failureReason: text('failure_reason'),
  failureCode: varchar('failure_code', { length: 100 }),
  
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('billing_transactions_user_idx').on(table.userId),
  orgIdIdx: index('billing_transactions_org_idx').on(table.organizationId),
  statusIdx: index('billing_transactions_status_idx').on(table.status),
  runIdIdx: index('billing_transactions_run_idx').on(table.billingRunId),
  stripeIdx: index('billing_transactions_stripe_idx').on(table.stripeChargeId),
}));

// Payment Method Requirements
export const paymentMethodRequirements = pgTable('payment_method_requirements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').unique().references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  requiresPaymentMethod: boolean('requires_payment_method').default(true),
  reason: varchar('reason', { length: 100 }),
  
  enforceAfter: timestamp('enforce_after'),
  suspendedAt: timestamp('suspended_at'),
  
  lastNotifiedAt: timestamp('last_notified_at'),
  notificationCount: integer('notification_count').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('payment_requirements_user_idx').on(table.userId),
}));

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  members: many(organizationMembers),
  subscriptions: many(subscriptions),
  invitations: many(teamInvitations),
  invoices: many(invoices),
  paymentMethods: many(paymentMethods),
  aiUsage: many(aiUsage),
  storageUsage: many(storageUsage),
  usageAlerts: many(usageAlerts),
  auditLogs: many(auditLogs),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  member: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
    relationName: 'memberUser', // ✅ Fix: explicit relation name
  }),
  inviter: one(users, {
    fields: [organizationMembers.invitedBy],
    references: [users.id],
    relationName: 'inviterUser', // ✅ Fix: explicit relation name
  }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  emailAccounts: many(emailAccounts),
  contacts: many(contacts),
  labels: many(labels),
  signatures: many(emailSignatures),
  preferences: one(userPreferences),
  aiChats: many(aiChatMessages),
  drafts: many(emailDrafts),
  smsMessages: many(smsMessages),
  smsUsage: many(smsUsage),
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  organizationMemberships: many(organizationMembers),
  subscriptions: many(subscriptions),
  invoices: many(invoices),
  paymentMethods: many(paymentMethods),
  aiUsageRecords: many(aiUsage),
  storageUsageRecords: many(storageUsage),
  usageAlertsOwned: many(usageAlerts),
  auditLogsCreated: many(auditLogs),
}));

export const emailAccountsRelations = relations(emailAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [emailAccounts.userId],
    references: [users.id],
  }),
  emails: many(emails),
  folders: many(emailFolders),
  signatures: many(emailSignatures),
  drafts: many(emailDrafts),
  webhookLogs: many(webhookLogs),
  syncLogs: many(syncLogs),
  webhookEvents: many(webhookEvents),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  account: one(emailAccounts, {
    fields: [emails.accountId],
    references: [emailAccounts.id],
  }),
  labels: many(emailLabels),
  aiChats: many(aiChatMessages),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  aiChats: many(aiChatMessages),
  communications: many(contactCommunications),
  notes: many(contactNotes),
  smsMessages: many(smsMessages),
  tagAssignments: many(contactTagAssignments),
  groupMemberships: many(contactGroupMemberships),
}));

// ============================================================================
// CONTACT TAGS AND GROUPS SYSTEM
// ============================================================================

// Contact Tags
export const contactTags = pgTable('contact_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).default('#4ecdc4'),
  icon: varchar('icon', { length: 50 }),
  description: text('description'),
  contactCount: integer('contact_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contact Groups
export const contactGroups = pgTable('contact_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#6366f1'),
  icon: varchar('icon', { length: 50 }),
  contactCount: integer('contact_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contact-Tag Assignments (Many-to-Many)
export const contactTagAssignments = pgTable('contact_tag_assignments', {
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => contactTags.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

// Contact-Group Memberships (Many-to-Many)
export const contactGroupMemberships = pgTable('contact_group_memberships', {
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  groupId: uuid('group_id').references(() => contactGroups.id, { onDelete: 'cascade' }).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// Relations
export const contactTagsRelations = relations(contactTags, ({ one, many }) => ({
  user: one(users, {
    fields: [contactTags.userId],
    references: [users.id],
  }),
  assignments: many(contactTagAssignments),
}));

export const contactGroupsRelations = relations(contactGroups, ({ one, many }) => ({
  user: one(users, {
    fields: [contactGroups.userId],
    references: [users.id],
  }),
  memberships: many(contactGroupMemberships),
}));

export const contactTagAssignmentsRelations = relations(contactTagAssignments, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactTagAssignments.contactId],
    references: [contacts.id],
  }),
  tag: one(contactTags, {
    fields: [contactTagAssignments.tagId],
    references: [contactTags.id],
  }),
}));

export const contactGroupMembershipsRelations = relations(contactGroupMemberships, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactGroupMemberships.contactId],
    references: [contacts.id],
  }),
  group: one(contactGroups, {
    fields: [contactGroupMemberships.groupId],
    references: [contactGroups.id],
  }),
}));

export const labelsRelations = relations(labels, ({ one, many }) => ({
  user: one(users, {
    fields: [labels.userId],
    references: [users.id],
  }),
  emailLabels: many(emailLabels),
}));

export const emailLabelsRelations = relations(emailLabels, ({ one }) => ({
  email: one(emails, {
    fields: [emailLabels.emailId],
    references: [emails.id],
  }),
  label: one(labels, {
    fields: [emailLabels.labelId],
    references: [labels.id],
  }),
}));

// Export thread tables
export * from './schema-threads';

// Export rule tables
export * from './schema-rules';

// ============================================================================
// PRICING AND BILLING TABLES
// ============================================================================

// Pricing Plans
export const pricingPlans = pgTable('pricing_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  basePriceMonthly: decimal('base_price_monthly', { precision: 10, scale: 2 }).notNull(),
  basePriceAnnual: decimal('base_price_annual', { precision: 10, scale: 2 }).notNull(),
  minSeats: integer('min_seats').default(1),
  maxSeats: integer('max_seats'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Usage-based Pricing
export const usagePricing = pgTable('usage_pricing', {
  id: uuid('id').defaultRandom().primaryKey(),
  serviceType: varchar('service_type', { length: 50 }).notNull().unique(),
  pricingModel: varchar('pricing_model', { length: 50 }).notNull(),
  baseRate: decimal('base_rate', { precision: 10, scale: 4 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pricing Tiers
export const pricingTiers = pgTable('pricing_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  usagePricingId: uuid('usage_pricing_id').notNull().references(() => usagePricing.id, { onDelete: 'cascade' }),
  tierName: varchar('tier_name', { length: 100 }),
  minQuantity: integer('min_quantity').notNull(),
  maxQuantity: integer('max_quantity'),
  ratePerUnit: decimal('rate_per_unit', { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Organization Pricing Overrides
export const organizationPricingOverrides = pgTable('organization_pricing_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id').references(() => pricingPlans.id),
  customMonthlyRate: decimal('custom_monthly_rate', { precision: 10, scale: 2 }),
  customAnnualRate: decimal('custom_annual_rate', { precision: 10, scale: 2 }),
  customSmsRate: decimal('custom_sms_rate', { precision: 10, scale: 4 }),
  customAiRate: decimal('custom_ai_rate', { precision: 10, scale: 4 }),
  customStorageRate: decimal('custom_storage_rate', { precision: 10, scale: 4 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Billing Settings
export const billingSettings = pgTable('billing_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  settingKey: varchar('setting_key', { length: 100 }).notNull().unique(),
  settingValue: text('setting_value').notNull(),
  dataType: varchar('data_type', { length: 20 }).notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Plan Feature Limits
export const planFeatureLimits = pgTable('plan_feature_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => pricingPlans.id, { onDelete: 'cascade' }),
  featureKey: varchar('feature_key', { length: 100 }).notNull(),
  limitValue: text('limit_value').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const pricingPlansRelations = relations(pricingPlans, ({ many }) => ({
  overrides: many(organizationPricingOverrides),
  featureLimits: many(planFeatureLimits),
}));

export const usagePricingRelations = relations(usagePricing, ({ many }) => ({
  tiers: many(pricingTiers),
}));

export const pricingTiersRelations = relations(pricingTiers, ({ one }) => ({
  usagePricing: one(usagePricing, {
    fields: [pricingTiers.usagePricingId],
    references: [usagePricing.id],
  }),
}));

export const organizationPricingOverridesRelations = relations(organizationPricingOverrides, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationPricingOverrides.organizationId],
    references: [organizations.id],
  }),
  plan: one(pricingPlans, {
    fields: [organizationPricingOverrides.planId],
    references: [pricingPlans.id],
  }),
}));

export const planFeatureLimitsRelations = relations(planFeatureLimits, ({ one }) => ({
  plan: one(pricingPlans, {
    fields: [planFeatureLimits.planId],
    references: [pricingPlans.id],
  }),
}));

// ================================
// EMAIL TEMPLATES SYSTEM
// ================================

// Email Templates Table - Visual editor for platform admins
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateKey: varchar('template_key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  subjectTemplate: text('subject_template').notNull(),
  htmlTemplate: text('html_template').notNull(),
  
  // Template metadata
  category: varchar('category', { length: 50 }).default('general'),
  triggerEvent: varchar('trigger_event', { length: 100 }),
  requiredVariables: jsonb('required_variables').$type<string[]>().default([]),
  
  // Versioning and status
  version: integer('version').notNull().default(1),
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  
  // Audit fields
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Email Template Versions - Version history
export const emailTemplateVersions = pgTable('email_template_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => emailTemplates.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  
  // Template content at this version
  subjectTemplate: text('subject_template').notNull(),
  htmlTemplate: text('html_template').notNull(),
  
  // Version metadata
  changeNotes: text('change_notes'),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Email Template Test Sends - Track test emails
export const emailTemplateTestSends = pgTable('email_template_test_sends', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => emailTemplates.id, { onDelete: 'cascade' }),
  sentTo: varchar('sent_to', { length: 255 }).notNull(),
  testData: jsonb('test_data').$type<Record<string, any>>(),
  sentBy: uuid('sent_by').references(() => users.id, { onDelete: 'set null' }),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
});

// Relations for email templates
export const emailTemplatesRelations = relations(emailTemplates, ({ many, one }) => ({
  versions: many(emailTemplateVersions),
  testSends: many(emailTemplateTestSends),
  creator: one(users, {
    fields: [emailTemplates.createdBy],
    references: [users.id],
    relationName: 'templateCreator',
  }),
  updater: one(users, {
    fields: [emailTemplates.updatedBy],
    references: [users.id],
    relationName: 'templateUpdater',
  }),
}));

export const emailTemplateVersionsRelations = relations(emailTemplateVersions, ({ one }) => ({
  template: one(emailTemplates, {
    fields: [emailTemplateVersions.templateId],
    references: [emailTemplates.id],
  }),
  creator: one(users, {
    fields: [emailTemplateVersions.createdBy],
    references: [users.id],
  }),
}));

export const emailTemplateTestSendsRelations = relations(emailTemplateTestSends, ({ one }) => ({
  template: one(emailTemplates, {
    fields: [emailTemplateTestSends.templateId],
    references: [emailTemplates.id],
  }),
  sender: one(users, {
    fields: [emailTemplateTestSends.sentBy],
    references: [users.id],
  }),
}));

// Email Rules Table (Simplified Outlook-style rules)
export const emailRules = pgTable('email_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  grantId: varchar('grant_id', { length: 255 }).notNull(), // Nylas grant ID

  // Basic fields
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),

  // Rule configuration (simplified JSON structure)
  conditions: jsonb('conditions').notNull(), // Array of conditions
  actions: jsonb('actions').notNull(), // Array of actions
  matchAll: boolean('match_all').default(true).notNull(), // true = AND, false = OR
  stopProcessing: boolean('stop_processing').default(false).notNull(),

  // Performance tracking
  executionCount: integer('execution_count').default(0).notNull(),
  successCount: integer('success_count').default(0).notNull(),
  failureCount: integer('failure_count').default(0).notNull(),
  lastExecutedAt: timestamp('last_executed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userActiveIdx: index('idx_email_rules_user_active').on(table.userId, table.isActive),
  grantIdx: index('idx_email_rules_grant').on(table.grantId),
  uniqueRuleName: unique('unique_rule_name_per_user').on(table.userId, table.name),
}));

// Rule Activity Log Table (Last 50 executions per rule)
export const ruleActivity = pgTable('rule_activity', {
  id: uuid('id').defaultRandom().primaryKey(),
  ruleId: uuid('rule_id').references(() => emailRules.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Email context
  messageId: varchar('message_id', { length: 255 }).notNull(),
  messageSubject: text('message_subject'),
  messageFrom: varchar('message_from', { length: 255 }),

  // Execution result
  status: varchar('status', { length: 20 }).notNull(), // 'success', 'error'
  errorMessage: text('error_message'),
  executionTimeMs: integer('execution_time_ms'),

  executedAt: timestamp('executed_at').defaultNow().notNull(),
}, (table) => ({
  ruleIdx: index('idx_rule_activity_rule').on(table.ruleId, table.executedAt),
  userIdx: index('idx_rule_activity_user').on(table.userId, table.executedAt),
  statusIdx: index('idx_rule_activity_status').on(table.status),
}));

// Relations
export const emailRulesRelations = relations(emailRules, ({ one, many }) => ({
  user: one(users, {
    fields: [emailRules.userId],
    references: [users.id],
  }),
  activity: many(ruleActivity),
}));

export const ruleActivityRelations = relations(ruleActivity, ({ one }) => ({
  rule: one(emailRules, {
    fields: [ruleActivity.ruleId],
    references: [emailRules.id],
  }),
  user: one(users, {
    fields: [ruleActivity.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// EMAIL TRACKING SYSTEM
// ============================================================================

// Email Tracking Events
export const emailTrackingEvents = pgTable('email_tracking_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailId: uuid('email_id').references(() => emails.id, { onDelete: 'cascade' }),
  draftId: uuid('draft_id').references(() => emailDrafts.id, { onDelete: 'cascade' }),

  // Tracking ID (unique for each sent email)
  trackingId: varchar('tracking_id', { length: 255 }).notNull().unique(),

  // Email details
  recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
  subject: text('subject'),

  // Tracking data
  opened: boolean('opened').default(false),
  openCount: integer('open_count').default(0),
  firstOpenedAt: timestamp('first_opened_at'),
  lastOpenedAt: timestamp('last_opened_at'),

  clickCount: integer('click_count').default(0),
  firstClickedAt: timestamp('first_clicked_at'),
  lastClickedAt: timestamp('last_clicked_at'),

  delivered: boolean('delivered').default(false),
  deliveredAt: timestamp('delivered_at'),

  bounced: boolean('bounced').default(false),
  bouncedAt: timestamp('bounced_at'),
  bounceReason: text('bounce_reason'),

  // Metadata
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  location: jsonb('location').$type<{
    city?: string;
    region?: string;
    country?: string;
  }>(),
  device: jsonb('device').$type<{
    type?: string;
    browser?: string;
    os?: string;
  }>(),

  sentAt: timestamp('sent_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('email_tracking_user_id_idx').on(table.userId),
  emailIdIdx: index('email_tracking_email_id_idx').on(table.emailId),
  trackingIdIdx: index('email_tracking_tracking_id_idx').on(table.trackingId),
  recipientIdx: index('email_tracking_recipient_idx').on(table.recipientEmail),
  sentAtIdx: index('email_tracking_sent_at_idx').on(table.sentAt),
}));

// Link Click Tracking
export const emailLinkClicks = pgTable('email_link_clicks', {
  id: uuid('id').defaultRandom().primaryKey(),
  trackingEventId: uuid('tracking_event_id').references(() => emailTrackingEvents.id, { onDelete: 'cascade' }).notNull(),

  // Link details
  linkUrl: text('link_url').notNull(),
  linkText: text('link_text'),
  linkIndex: integer('link_index').notNull(),

  // Click data
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  referrer: text('referrer'),

  // Location & device
  location: jsonb('location').$type<{
    city?: string;
    region?: string;
    country?: string;
  }>(),
  device: jsonb('device').$type<{
    type?: string;
    browser?: string;
    os?: string;
  }>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  trackingEventIdx: index('email_link_clicks_tracking_event_idx').on(table.trackingEventId),
  linkUrlIdx: index('email_link_clicks_link_url_idx').on(table.linkUrl),
  clickedAtIdx: index('email_link_clicks_clicked_at_idx').on(table.clickedAt),
}));

// Scheduled Emails
export const scheduledEmails = pgTable('scheduled_emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }).notNull(),
  draftId: uuid('draft_id').references(() => emailDrafts.id, { onDelete: 'set null' }),

  // Recipients
  toRecipients: jsonb('to_recipients').$type<Array<{ email: string; name?: string }>>().notNull(),
  cc: jsonb('cc').$type<Array<{ email: string; name?: string }>>(),
  bcc: jsonb('bcc').$type<Array<{ email: string; name?: string }>>(),

  // Content
  subject: text('subject'),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),

  // Attachments
  attachments: jsonb('attachments').$type<Array<{
    filename: string;
    size: number;
    contentType: string;
    url: string;
  }>>(),

  // Scheduling
  scheduledFor: timestamp('scheduled_for').notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),

  // Tracking options
  trackOpens: boolean('track_opens').default(true),
  trackClicks: boolean('track_clicks').default(true),

  // Status
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'sent', 'failed', 'cancelled'
  sentAt: timestamp('sent_at'),
  providerMessageId: varchar('provider_message_id', { length: 255 }),

  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('scheduled_emails_user_id_idx').on(table.userId),
  accountIdIdx: index('scheduled_emails_account_id_idx').on(table.accountId),
  scheduledForIdx: index('scheduled_emails_scheduled_for_idx').on(table.scheduledFor),
  statusIdx: index('scheduled_emails_status_idx').on(table.status),
  pendingIdx: index('scheduled_emails_pending_idx').on(table.status, table.scheduledFor),
}));

// User Activity Logs Table (for detailed tracking of beta user activities)
export const userActivityLogs = pgTable('user_activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Activity details
  activityType: varchar('activity_type', { length: 100 }).notNull(), // 'login', 'page_view', 'feature_use', 'error', 'api_call', etc.
  activityName: varchar('activity_name', { length: 255 }).notNull(), // Specific name like 'composed_email', 'created_rule', 'opened_settings'
  path: text('path'), // URL path or route
  method: varchar('method', { length: 10 }), // HTTP method for API calls

  // Status and error tracking
  status: varchar('status', { length: 50 }).default('success'), // 'success', 'error', 'warning'
  errorMessage: text('error_message'), // Error message if status is 'error'
  errorStack: text('error_stack'), // Stack trace for debugging
  isFlagged: boolean('is_flagged').default(false), // Flag for admin review

  // Context and metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(), // Additional context (feature params, filters used, etc.)
  duration: integer('duration'), // Duration in milliseconds

  // Request details
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  browser: varchar('browser', { length: 100 }),
  os: varchar('os', { length: 100 }),
  device: varchar('device', { length: 100 }), // 'desktop', 'mobile', 'tablet'

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('activity_logs_user_id_idx').on(table.userId),
  activityTypeIdx: index('activity_logs_activity_type_idx').on(table.activityType),
  statusIdx: index('activity_logs_status_idx').on(table.status),
  isFlaggedIdx: index('activity_logs_is_flagged_idx').on(table.isFlagged),
  createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
}));

// Relations
export const emailTrackingEventsRelations = relations(emailTrackingEvents, ({ one, many }) => ({
  user: one(users, {
    fields: [emailTrackingEvents.userId],
    references: [users.id],
  }),
  email: one(emails, {
    fields: [emailTrackingEvents.emailId],
    references: [emails.id],
  }),
  draft: one(emailDrafts, {
    fields: [emailTrackingEvents.draftId],
    references: [emailDrafts.id],
  }),
  linkClicks: many(emailLinkClicks),
}));

export const emailLinkClicksRelations = relations(emailLinkClicks, ({ one }) => ({
  trackingEvent: one(emailTrackingEvents, {
    fields: [emailLinkClicks.trackingEventId],
    references: [emailTrackingEvents.id],
  }),
}));

export const scheduledEmailsRelations = relations(scheduledEmails, ({ one }) => ({
  user: one(users, {
    fields: [scheduledEmails.userId],
    references: [users.id],
  }),
  account: one(emailAccounts, {
    fields: [scheduledEmails.accountId],
    references: [emailAccounts.id],
  }),
  draft: one(emailDrafts, {
    fields: [scheduledEmails.draftId],
    references: [emailDrafts.id],
  }),
}));

// =============================================================================
// ENHANCED BILLING & COST TRACKING TABLES
// =============================================================================

// Cost Entries - Unified tracking for all services
export const costEntries = pgTable('cost_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  // Cost details
  service: varchar('service', { length: 50 }).notNull(), // 'openai', 'sms', 'storage', 'whisper', 'stripe_fee'
  feature: varchar('feature', { length: 100 }), // 'ai_compose', 'ai_summary', 'dictation', etc
  costUsd: decimal('cost_usd', { precision: 10, scale: 4 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }),
  unit: varchar('unit', { length: 50 }), // 'tokens', 'messages', 'gb', 'api_call'
  
  // Attribution
  billableToOrg: boolean('billable_to_org').default(false),
  
  // Time tracking
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  occurredAt: timestamp('occurred_at').defaultNow(),
  
  // Billing linkage
  invoiceId: uuid('invoice_id'),
  invoiceLineItemId: uuid('invoice_line_item_id'),
  transactionId: uuid('transaction_id'),
  
  // Additional data
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_cost_user').on(table.userId),
  orgIdx: index('idx_cost_org').on(table.organizationId),
  periodIdx: index('idx_cost_period').on(table.periodStart, table.periodEnd),
  serviceIdx: index('idx_cost_service').on(table.service),
  invoiceIdx: index('idx_cost_invoice').on(table.invoiceId),
}));

// Subscription Periods - Pro-rating tracking
export const subscriptionPeriods = pgTable('subscription_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  // Period details
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  isProRated: boolean('is_pro_rated').default(false),
  daysInPeriod: integer('days_in_period'),
  daysInFullMonth: integer('days_in_full_month'),
  
  // Pricing
  basePrice: decimal('base_price', { precision: 10, scale: 2 }),
  proRatedPrice: decimal('pro_rated_price', { precision: 10, scale: 2 }),
  
  // Billing status
  invoiceId: uuid('invoice_id'),
  billedAt: timestamp('billed_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  subscriptionIdx: index('idx_subperiod_subscription').on(table.subscriptionId),
  periodIdx: index('idx_subperiod_period').on(table.periodStart, table.periodEnd),
}));

// Revenue Schedule - Revenue recognition
export const revenueSchedule = pgTable('revenue_schedule', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull(),
  invoiceLineItemId: uuid('invoice_line_item_id'),
  
  // Revenue details
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  recognizedAmount: decimal('recognized_amount', { precision: 10, scale: 2 }).default('0'),
  unrecognizedAmount: decimal('unrecognized_amount', { precision: 10, scale: 2 }),
  
  // Schedule
  recognitionStart: timestamp('recognition_start').notNull(),
  recognitionEnd: timestamp('recognition_end').notNull(),
  recognitionMethod: varchar('recognition_method', { length: 50 }), // 'immediate', 'monthly', 'daily'
  
  // Status
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'recognizing', 'complete'
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  invoiceIdx: index('idx_revenue_invoice').on(table.invoiceId),
  periodIdx: index('idx_revenue_period').on(table.recognitionStart, table.recognitionEnd),
  statusIdx: index('idx_revenue_status').on(table.status),
}));

// Credit Notes - Refunds and adjustments
export const creditNotes = pgTable('credit_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  creditNoteNumber: varchar('credit_note_number', { length: 50 }).notNull().unique(),
  invoiceId: uuid('invoice_id'),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  // Amounts
  amountUsd: decimal('amount_usd', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason'),
  type: varchar('type', { length: 50 }), // 'refund', 'adjustment', 'goodwill', 'dispute'
  
  // Status
  status: varchar('status', { length: 50 }).default('draft'), // 'draft', 'issued', 'applied', 'void'
  issuedAt: timestamp('issued_at'),
  appliedAt: timestamp('applied_at'),
  
  // Stripe integration
  stripeCreditNoteId: varchar('stripe_credit_note_id', { length: 255 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  invoiceIdx: index('idx_credit_invoice').on(table.invoiceId),
  userIdx: index('idx_credit_user').on(table.userId),
  orgIdx: index('idx_credit_org').on(table.organizationId),
  statusIdx: index('idx_credit_status').on(table.status),
}));

// Account Status History - Track status changes
export const accountStatusHistory = pgTable('account_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  // Status change
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  reason: text('reason'),
  
  // Related entities
  invoiceId: uuid('invoice_id'),
  transactionId: uuid('transaction_id'),
  
  // Who/when
  changedBy: uuid('changed_by').references(() => users.id),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),
}, (table) => ({
  userIdx: index('idx_status_history_user').on(table.userId),
  orgIdx: index('idx_status_history_org').on(table.organizationId),
  dateIdx: index('idx_status_history_date').on(table.changedAt),
}));

// Billing Notices - User notifications
export const billingNotices = pgTable('billing_notices', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  // Notice details
  noticeType: varchar('notice_type', { length: 50 }).notNull(), // 'payment_failed', 'payment_retry', 'grace_period', etc.
  severity: varchar('severity', { length: 20 }).notNull(), // 'info', 'warning', 'critical'
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  
  // Related entities
  invoiceId: uuid('invoice_id'),
  transactionId: uuid('transaction_id'),
  
  // Status
  status: varchar('status', { length: 50 }).default('pending'), // 'pending', 'sent', 'read', 'dismissed'
  sentAt: timestamp('sent_at'),
  readAt: timestamp('read_at'),
  dismissedAt: timestamp('dismissed_at'),
  
  // Expiry
  expiresAt: timestamp('expires_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_notices_user').on(table.userId),
  orgIdx: index('idx_notices_org').on(table.organizationId),
  statusIdx: index('idx_notices_status').on(table.status),
  typeIdx: index('idx_notices_type').on(table.noticeType),
}));

// Blocked Senders Table
export const blockedSenders = pgTable('blocked_senders', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),
  senderEmail: varchar('sender_email', { length: 255 }).notNull(),
  senderName: varchar('sender_name', { length: 255 }),
  blockedAt: timestamp('blocked_at').defaultNow().notNull(),
  reason: text('reason'),
}, (table) => ({
  userIdx: index('idx_blocked_senders_user').on(table.userId),
  emailIdx: index('idx_blocked_senders_email').on(table.senderEmail),
  uniqueBlock: unique('blocked_senders_unique').on(table.userId, table.senderEmail),
}));

// Muted Conversations Table
export const mutedConversations = pgTable('muted_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }),
  threadId: varchar('thread_id', { length: 255 }).notNull(),
  mutedAt: timestamp('muted_at').defaultNow().notNull(),
  mutedUntil: timestamp('muted_until'), // null = forever
}, (table) => ({
  userIdx: index('idx_muted_conv_user').on(table.userId),
  threadIdx: index('idx_muted_conv_thread').on(table.threadId),
  uniqueMute: unique('muted_conv_unique').on(table.userId, table.threadId),
}));


// Aliases for snake_case compatibility
export const sms_usage = smsUsage;
export const ai_usage = aiUsage;
export const storage_usage = storageUsage;
export const cost_entries = costEntries;
export const subscription_periods = subscriptionPeriods;
export const revenue_schedule = revenueSchedule;
export const credit_notes = creditNotes;
export const account_status_history = accountStatusHistory;
export const billing_notices = billingNotices;
export const blocked_senders = blockedSenders;
export const muted_conversations = mutedConversations;
export const user_email_templates = userEmailTemplates;

// Contacts V4 exports
export * from './schema-contacts-v4';

