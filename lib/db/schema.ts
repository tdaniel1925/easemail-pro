import { pgTable, uuid, varchar, text, timestamp, boolean, integer, bigint, jsonb, index, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users Table (synced with Supabase Auth)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  fullName: varchar('full_name', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Email Accounts with Nylas/Aurinko support
export const emailAccounts = pgTable('email_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Provider info
  provider: varchar('provider', { length: 50 }).notNull(), // 'nylas' or 'aurinko'
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  
  // Email details
  emailAddress: varchar('email_address', { length: 255 }).notNull(),
  emailProvider: varchar('email_provider', { length: 50 }), // 'gmail', 'outlook', 'imap', etc.
  
  // OAuth tokens (encrypted)
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiry: timestamp('token_expiry'),
  
  // Nylas specific
  nylasGrantId: varchar('nylas_grant_id', { length: 255 }),
  nylasEmail: varchar('nylas_email', { length: 255 }),
  nylasProvider: varchar('nylas_provider', { length: 50 }),
  nylasScopes: jsonb('nylas_scopes').$type<string[]>(),
  
  // Aurinko specific
  aurinkoAccountId: varchar('aurinko_account_id', { length: 255 }),
  aurinkoServiceType: varchar('aurinko_service_type', { length: 50 }),
  aurinkoUserId: varchar('aurinko_user_id', { length: 255 }),
  
  // Sync status
  syncStatus: varchar('sync_status', { length: 50 }).default('idle'), // 'idle', 'syncing', 'completed', 'error', 'background_syncing'
  lastSyncedAt: timestamp('last_synced_at'),
  lastError: text('last_error'),
  syncCursor: text('sync_cursor'), // Nylas pagination token
  initialSyncCompleted: boolean('initial_sync_completed').default(false),
  totalEmailCount: integer('total_email_count').default(0),
  syncedEmailCount: integer('synced_email_count').default(0),
  syncProgress: integer('sync_progress').default(0), // 0-100 percentage
  
  // Webhooks
  webhookId: varchar('webhook_id', { length: 255 }),
  webhookStatus: varchar('webhook_status', { length: 50 }).default('inactive'),
  
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
});

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
  
  // Storage
  storagePath: varchar('storage_path', { length: 1000 }).notNull(),
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
  
  // Basic info
  email: varchar('email', { length: 255 }).notNull(),
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
  
  // Reading
  autoAdvance: boolean('auto_advance').default(true),
  conversationView: boolean('conversation_view').default(true),
  showImages: boolean('show_images').default(false),
  markAsReadOnView: boolean('mark_as_read_on_view').default(true),
  
  // Composing
  smartCompose: boolean('smart_compose').default(true),
  defaultReplyBehavior: varchar('default_reply_behavior', { length: 20 }).default('reply'),
  autoSaveDrafts: boolean('auto_save_drafts').default(true),
  
  // Notifications
  notificationsEnabled: boolean('notifications_enabled').default(true),
  desktopNotifications: boolean('desktop_notifications').default(true),
  soundEnabled: boolean('sound_enabled').default(true),
  
  // AI Features
  aiEnabled: boolean('ai_enabled').default(true),
  aiAutoSummarize: boolean('ai_auto_summarize').default(true),
  aiAttachmentProcessing: boolean('ai_attachment_processing').default(false), // Default OFF for security
  
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
  to: jsonb('to').$type<Array<{ email: string; name?: string }>>().notNull(),
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

// SMS Usage Tracking
export const smsUsage = pgTable('sms_usage', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  totalMessagesSent: integer('total_messages_sent').default(0),
  totalCostUsd: varchar('total_cost_usd', { length: 20 }).default('0'),
  totalChargedUsd: varchar('total_charged_usd', { length: 20 }).default('0'),
  
  billingStatus: varchar('billing_status', { length: 50 }).default('pending'),
  invoiceId: varchar('invoice_id', { length: 255 }),
  
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

// Relations
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

