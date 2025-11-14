/**
 * Contacts V4 Drizzle Schema
 * Separate file for clean organization
 * Import this in main schema.ts
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, index, unique, date } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import type {
  NylasEmail,
  NylasPhoneNumber,
  NylasPhysicalAddress,
  NylasWebPage,
  NylasIMAddress,
  NylasContactGroup,
} from '../types/contacts-v4';

// ============================================
// CONTACTS V4 TABLE
// ============================================

export const contactsV4 = pgTable('contacts_v4', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // References auth.users
  accountId: uuid('account_id').notNull(), // References email_accounts

  // Nylas Integration
  nylasContactId: varchar('nylas_contact_id', { length: 255 }),
  nylasGrantId: varchar('nylas_grant_id', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 20 }).notNull(), // 'google' | 'microsoft'
  source: varchar('source', { length: 20 }).default('address_book'), // 'address_book' | 'domain' | 'inbox' | 'easemail'

  // Name Fields
  givenName: varchar('given_name', { length: 255 }),
  middleName: varchar('middle_name', { length: 255 }),
  surname: varchar('surname', { length: 255 }),
  suffix: varchar('suffix', { length: 50 }),
  nickname: varchar('nickname', { length: 255 }),

  // Display name is computed in database, but we can override in UI
  displayName: varchar('display_name', { length: 512 }),

  // Contact Information (JSONB arrays)
  emails: jsonb('emails').$type<NylasEmail[]>().default([]),
  phoneNumbers: jsonb('phone_numbers').$type<NylasPhoneNumber[]>().default([]),
  physicalAddresses: jsonb('physical_addresses').$type<NylasPhysicalAddress[]>().default([]),
  webPages: jsonb('web_pages').$type<NylasWebPage[]>().default([]),
  imAddresses: jsonb('im_addresses').$type<NylasIMAddress[]>().default([]),

  // Professional Information
  jobTitle: varchar('job_title', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  managerName: varchar('manager_name', { length: 255 }),
  officeLocation: varchar('office_location', { length: 255 }),
  department: varchar('department', { length: 255 }),

  // Personal Information
  birthday: date('birthday'),
  notes: text('notes'),

  // Profile Picture
  pictureUrl: text('picture_url'),
  pictureData: text('picture_data'), // Base64 encoded
  pictureUpdatedAt: timestamp('picture_updated_at'),

  // Organization
  groups: jsonb('groups').$type<NylasContactGroup[]>().default([]),
  tags: jsonb('tags').$type<string[]>().default([]),

  // Metadata
  isFavorite: boolean('is_favorite').default(false),
  isDeleted: boolean('is_deleted').default(false),

  // Sync State
  syncStatus: varchar('sync_status', { length: 20 }).default('synced'), // 'synced' | 'pending_create' | 'pending_update' | 'pending_delete' | 'error' | 'conflict'
  syncError: text('sync_error'),
  lastSyncedAt: timestamp('last_synced_at'),

  // Versioning
  version: integer('version').default(1),
  etag: varchar('etag', { length: 255 }),
  localUpdatedAt: timestamp('local_updated_at').defaultNow(),
  remoteUpdatedAt: timestamp('remote_updated_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  // Primary indexes
  userIdIdx: index('contacts_v4_user_id_idx').on(table.userId).where(sql`${table.isDeleted} = false`),
  accountIdIdx: index('contacts_v4_account_id_idx').on(table.accountId).where(sql`${table.isDeleted} = false`),
  nylasIdIdx: index('contacts_v4_nylas_id_idx').on(table.nylasContactId),

  // Search indexes
  displayNameIdx: index('contacts_v4_display_name_idx').on(table.displayName).where(sql`${table.isDeleted} = false`),
  surnameIdx: index('contacts_v4_surname_idx').on(table.surname).where(sql`${table.isDeleted} = false`),
  companyIdx: index('contacts_v4_company_idx').on(table.companyName).where(sql`${table.isDeleted} = false`),

  // Sync indexes
  syncStatusIdx: index('contacts_v4_sync_status_idx').on(table.syncStatus),
  lastSyncedIdx: index('contacts_v4_last_synced_idx').on(table.lastSyncedAt),
  favoriteIdx: index('contacts_v4_favorite_idx').on(table.isFavorite).where(sql`${table.isFavorite} = true`),

  // Unique constraint
  uniqueNylasContact: unique('contacts_v4_unique_nylas').on(table.accountId, table.nylasContactId),
}));

// ============================================
// CONTACT SYNC STATE
// ============================================

export const contactSyncState = pgTable('contact_sync_state', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  accountId: uuid('account_id').notNull().unique(),

  // Sync Tracking
  lastSuccessfulSync: timestamp('last_successful_sync'),
  lastSyncAttempt: timestamp('last_sync_attempt'),
  nextSyncScheduled: timestamp('next_sync_scheduled'),

  // Statistics
  totalContacts: integer('total_contacts').default(0),
  syncedContacts: integer('synced_contacts').default(0),
  pendingContacts: integer('pending_contacts').default(0),
  errorContacts: integer('error_contacts').default(0),
  conflictContacts: integer('conflict_contacts').default(0),

  // Status
  syncStatus: varchar('sync_status', { length: 20 }).default('idle'), // 'idle' | 'syncing' | 'error' | 'paused'
  syncError: text('sync_error'),
  currentOperation: varchar('current_operation', { length: 50 }),

  // Progress
  progressCurrent: integer('progress_current').default(0),
  progressTotal: integer('progress_total').default(0),
  progressPercentage: integer('progress_percentage').default(0),

  // Configuration
  syncEnabled: boolean('sync_enabled').default(true),
  syncIntervalMinutes: integer('sync_interval_minutes').default(5), // Google polls every 5 min
  autoSync: boolean('auto_sync').default(true),

  // Cursor for pagination
  lastSyncCursor: varchar('last_sync_cursor', { length: 512 }),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  accountIdIdx: index('sync_state_account_idx').on(table.accountId),
  statusIdx: index('sync_state_status_idx').on(table.syncStatus),
  nextSyncIdx: index('sync_state_next_sync_idx').on(table.nextSyncScheduled).where(sql`${table.syncEnabled} = true`),
}));

// ============================================
// CONTACT SYNC LOGS
// ============================================

export const contactSyncLogs = pgTable('contact_sync_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  accountId: uuid('account_id').notNull(),
  contactId: uuid('contact_id'), // Can be null if contact was deleted

  // Operation
  operation: varchar('operation', { length: 20 }).notNull(), // 'create' | 'update' | 'delete' | 'sync' | 'conflict' | 'error'
  direction: varchar('direction', { length: 20 }).notNull(), // 'local_to_remote' | 'remote_to_local' | 'bidirectional'

  // Status
  status: varchar('status', { length: 20 }).notNull(), // 'success' | 'error' | 'skipped' | 'pending'
  errorMessage: text('error_message'),
  errorCode: varchar('error_code', { length: 50 }),

  // Changes
  changesMade: jsonb('changes_made').$type<Array<{
    field: string;
    old_value: any;
    new_value: any;
  }>>(),

  // Performance
  durationMs: integer('duration_ms'),

  // Context
  triggeredBy: varchar('triggered_by', { length: 50 }), // 'user' | 'scheduled_sync' | 'manual_sync' | 'webhook' | 'system'

  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  accountIdIdx: index('sync_logs_account_idx').on(table.accountId, table.createdAt),
  contactIdIdx: index('sync_logs_contact_idx').on(table.contactId),
  statusIdx: index('sync_logs_status_idx').on(table.status).where(sql`${table.status} = 'error'`),
  createdIdx: index('sync_logs_created_idx').on(table.createdAt),
}));

// ============================================
// CONTACT CONFLICTS
// ============================================

export const contactConflicts = pgTable('contact_conflicts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  contactId: uuid('contact_id').notNull(),

  // Conflict Data
  localVersion: jsonb('local_version').notNull(),
  remoteVersion: jsonb('remote_version').notNull(),

  // Details
  conflictFields: jsonb('conflict_fields').$type<string[]>().notNull(),
  conflictReason: text('conflict_reason'),
  conflictType: varchar('conflict_type', { length: 50 }), // 'concurrent_edit' | 'delete_modified' | 'field_mismatch'

  // Resolution
  resolutionStrategy: varchar('resolution_strategy', { length: 50 }), // 'keep_local' | 'keep_remote' | 'merge' | 'manual'
  resolvedVersion: jsonb('resolved_version'),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at'),

  // Status
  status: varchar('status', { length: 20 }).default('pending'), // 'pending' | 'resolved' | 'ignored' | 'auto_resolved'

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('conflicts_user_idx').on(table.userId).where(sql`${table.status} = 'pending'`),
  contactIdIdx: index('conflicts_contact_idx').on(table.contactId),
  statusIdx: index('conflicts_status_idx').on(table.status),
}));

// ============================================
// CONTACT GROUPS
// ============================================

export const contactGroups = pgTable('contact_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  accountId: uuid('account_id').notNull(),

  // Group Details
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Nylas Integration
  nylasGroupId: varchar('nylas_group_id', { length: 255 }),
  groupType: varchar('group_type', { length: 20 }).default('user'), // 'system' | 'user'

  // UI Customization
  color: varchar('color', { length: 7 }),
  icon: varchar('icon', { length: 50 }),

  // Stats
  contactCount: integer('contact_count').default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  accountIdIdx: index('groups_account_idx').on(table.accountId),
  nameIdx: index('groups_name_idx').on(table.name),
  uniqueGroupName: unique('groups_unique_name').on(table.accountId, table.name),
}));

// ============================================
// RELATIONS
// ============================================

export const contactsV4Relations = relations(contactsV4, ({ one }) => ({
  syncState: one(contactSyncState, {
    fields: [contactsV4.accountId],
    references: [contactSyncState.accountId],
  }),
}));

export const contactSyncStateRelations = relations(contactSyncState, ({ many }) => ({
  contacts: many(contactsV4),
  logs: many(contactSyncLogs),
}));

export const contactSyncLogsRelations = relations(contactSyncLogs, ({ one }) => ({
  contact: one(contactsV4, {
    fields: [contactSyncLogs.contactId],
    references: [contactsV4.id],
  }),
  syncState: one(contactSyncState, {
    fields: [contactSyncLogs.accountId],
    references: [contactSyncState.accountId],
  }),
}));

export const contactConflictsRelations = relations(contactConflicts, ({ one }) => ({
  contact: one(contactsV4, {
    fields: [contactConflicts.contactId],
    references: [contactsV4.id],
  }),
}));

export const contactGroupsRelations = relations(contactGroups, ({ one }) => ({
  syncState: one(contactSyncState, {
    fields: [contactGroups.accountId],
    references: [contactSyncState.accountId],
  }),
}));
