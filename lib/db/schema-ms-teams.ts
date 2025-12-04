/**
 * MS Teams Integration Database Schema
 *
 * Tables for storing:
 * - MS Graph accounts (OAuth tokens)
 * - Teams and channels cache
 * - Chat messages cache
 * - User presence settings
 */

import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './schema';

// ============================================================================
// MS GRAPH ACCOUNTS (OAuth tokens for MS Teams)
// ============================================================================

export const msGraphAccounts = pgTable('ms_graph_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // MS Graph user info
  msUserId: varchar('ms_user_id', { length: 255 }).notNull(), // Microsoft user ID
  email: varchar('email', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  userPrincipalName: varchar('user_principal_name', { length: 255 }),

  // OAuth tokens (encrypted)
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  scopes: jsonb('scopes').$type<string[]>(),

  // Connection status
  isConnected: boolean('is_connected').default(true),
  lastSyncedAt: timestamp('last_synced_at'),
  lastError: text('last_error'),
  refreshFailures: integer('refresh_failures').default(0),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('idx_ms_graph_accounts_user_id').on(table.userId),
  msUserIdIdx: index('idx_ms_graph_accounts_ms_user_id').on(table.msUserId),
  uniqueUserMs: unique('ms_graph_accounts_unique').on(table.userId, table.msUserId),
}));

// ============================================================================
// MS TEAMS CACHE (Teams the user belongs to)
// ============================================================================

export const msTeamsCache = pgTable('ms_teams_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  msAccountId: uuid('ms_account_id').references(() => msGraphAccounts.id, { onDelete: 'cascade' }).notNull(),

  // Team info from MS Graph
  msTeamId: varchar('ms_team_id', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  webUrl: text('web_url'),
  isArchived: boolean('is_archived').default(false),

  // Sync metadata
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  msAccountIdIdx: index('idx_ms_teams_cache_account_id').on(table.msAccountId),
  msTeamIdIdx: index('idx_ms_teams_cache_team_id').on(table.msTeamId),
  uniqueTeam: unique('ms_teams_cache_unique').on(table.msAccountId, table.msTeamId),
}));

// ============================================================================
// MS CHANNELS CACHE (Channels within teams)
// ============================================================================

export const msChannelsCache = pgTable('ms_channels_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamCacheId: uuid('team_cache_id').references(() => msTeamsCache.id, { onDelete: 'cascade' }).notNull(),

  // Channel info from MS Graph
  msChannelId: varchar('ms_channel_id', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  webUrl: text('web_url'),
  membershipType: varchar('membership_type', { length: 50 }), // 'standard', 'private', 'shared'

  // Sync metadata
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  teamCacheIdIdx: index('idx_ms_channels_cache_team_id').on(table.teamCacheId),
  msChannelIdIdx: index('idx_ms_channels_cache_channel_id').on(table.msChannelId),
  uniqueChannel: unique('ms_channels_cache_unique').on(table.teamCacheId, table.msChannelId),
}));

// ============================================================================
// MS CHATS CACHE (1:1 and group chats)
// ============================================================================

export const msChatsCache = pgTable('ms_chats_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  msAccountId: uuid('ms_account_id').references(() => msGraphAccounts.id, { onDelete: 'cascade' }).notNull(),

  // Chat info from MS Graph
  msChatId: varchar('ms_chat_id', { length: 255 }).notNull(),
  chatType: varchar('chat_type', { length: 50 }).notNull(), // 'oneOnOne', 'group', 'meeting'
  topic: varchar('topic', { length: 255 }),

  // Members (cached for display)
  members: jsonb('members').$type<Array<{
    id: string;
    displayName: string;
    email?: string;
    userId?: string;
  }>>(),

  // Last message preview
  lastMessagePreview: text('last_message_preview'),
  lastMessageAt: timestamp('last_message_at'),

  // Unread count
  unreadCount: integer('unread_count').default(0),

  // Sync metadata
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  msAccountIdIdx: index('idx_ms_chats_cache_account_id').on(table.msAccountId),
  msChatIdIdx: index('idx_ms_chats_cache_chat_id').on(table.msChatId),
  lastMessageAtIdx: index('idx_ms_chats_cache_last_message').on(table.lastMessageAt),
  uniqueChat: unique('ms_chats_cache_unique').on(table.msAccountId, table.msChatId),
}));

// ============================================================================
// MS MESSAGES CACHE (Chat and channel messages)
// ============================================================================

export const msMessagesCache = pgTable('ms_messages_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  msAccountId: uuid('ms_account_id').references(() => msGraphAccounts.id, { onDelete: 'cascade' }).notNull(),

  // Message location (either chat or channel)
  chatCacheId: uuid('chat_cache_id').references(() => msChatsCache.id, { onDelete: 'cascade' }),
  channelCacheId: uuid('channel_cache_id').references(() => msChannelsCache.id, { onDelete: 'cascade' }),

  // Message info from MS Graph
  msMessageId: varchar('ms_message_id', { length: 255 }).notNull(),
  contentType: varchar('content_type', { length: 50 }).default('text'), // 'text' or 'html'
  content: text('content'),

  // Sender info
  senderUserId: varchar('sender_user_id', { length: 255 }),
  senderDisplayName: varchar('sender_display_name', { length: 255 }),

  // Attachments
  hasAttachments: boolean('has_attachments').default(false),
  attachments: jsonb('attachments').$type<Array<{
    id: string;
    contentType: string;
    contentUrl?: string;
    name: string;
    thumbnailUrl?: string;
  }>>(),

  // Message metadata
  isFromMe: boolean('is_from_me').default(false),
  isRead: boolean('is_read').default(false),
  messageDateTime: timestamp('message_date_time').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  msAccountIdIdx: index('idx_ms_messages_cache_account_id').on(table.msAccountId),
  chatCacheIdIdx: index('idx_ms_messages_cache_chat_id').on(table.chatCacheId),
  channelCacheIdIdx: index('idx_ms_messages_cache_channel_id').on(table.channelCacheId),
  msMessageIdIdx: index('idx_ms_messages_cache_message_id').on(table.msMessageId),
  messageDateTimeIdx: index('idx_ms_messages_cache_datetime').on(table.messageDateTime),
}));

// ============================================================================
// MS PRESENCE SETTINGS (User presence preferences)
// ============================================================================

export const msPresenceSettings = pgTable('ms_presence_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  msAccountId: uuid('ms_account_id').references(() => msGraphAccounts.id, { onDelete: 'cascade' }).notNull(),

  // Auto-sync presence from Teams
  autoSyncPresence: boolean('auto_sync_presence').default(true),

  // Custom status settings
  customStatusMessage: text('custom_status_message'),
  customStatusExpiry: timestamp('custom_status_expiry'),

  // Notification preferences
  showDesktopNotifications: boolean('show_desktop_notifications').default(true),
  showBadgeCount: boolean('show_badge_count').default(true),
  playSoundOnMessage: boolean('play_sound_on_message').default(true),

  // Working hours (for auto-DND)
  workingHoursEnabled: boolean('working_hours_enabled').default(false),
  workingHoursStart: varchar('working_hours_start', { length: 10 }), // "09:00"
  workingHoursEnd: varchar('working_hours_end', { length: 10 }), // "17:00"
  workingHoursTimezone: varchar('working_hours_timezone', { length: 50 }),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  msAccountIdIdx: index('idx_ms_presence_settings_account_id').on(table.msAccountId),
  uniqueSettings: unique('ms_presence_settings_unique').on(table.msAccountId),
}));

// ============================================================================
// MS MEETINGS CACHE (Teams meetings)
// ============================================================================

export const msMeetingsCache = pgTable('ms_meetings_cache', {
  id: uuid('id').defaultRandom().primaryKey(),
  msAccountId: uuid('ms_account_id').references(() => msGraphAccounts.id, { onDelete: 'cascade' }).notNull(),

  // Meeting info from MS Graph
  msMeetingId: varchar('ms_meeting_id', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }),
  startDateTime: timestamp('start_date_time').notNull(),
  endDateTime: timestamp('end_date_time').notNull(),
  joinWebUrl: text('join_web_url'),

  // Organizer
  organizerUserId: varchar('organizer_user_id', { length: 255 }),
  organizerDisplayName: varchar('organizer_display_name', { length: 255 }),

  // Participants
  participants: jsonb('participants').$type<Array<{
    userId?: string;
    displayName: string;
    email?: string;
  }>>(),

  // Status
  status: varchar('status', { length: 50 }).default('scheduled'), // 'scheduled', 'started', 'ended', 'cancelled'

  // Sync metadata
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  msAccountIdIdx: index('idx_ms_meetings_cache_account_id').on(table.msAccountId),
  msMeetingIdIdx: index('idx_ms_meetings_cache_meeting_id').on(table.msMeetingId),
  startDateTimeIdx: index('idx_ms_meetings_cache_start').on(table.startDateTime),
  uniqueMeeting: unique('ms_meetings_cache_unique').on(table.msAccountId, table.msMeetingId),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const msGraphAccountsRelations = relations(msGraphAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [msGraphAccounts.userId],
    references: [users.id],
  }),
  teams: many(msTeamsCache),
  chats: many(msChatsCache),
  presenceSettings: one(msPresenceSettings),
  meetings: many(msMeetingsCache),
}));

export const msTeamsCacheRelations = relations(msTeamsCache, ({ one, many }) => ({
  msAccount: one(msGraphAccounts, {
    fields: [msTeamsCache.msAccountId],
    references: [msGraphAccounts.id],
  }),
  channels: many(msChannelsCache),
}));

export const msChannelsCacheRelations = relations(msChannelsCache, ({ one, many }) => ({
  team: one(msTeamsCache, {
    fields: [msChannelsCache.teamCacheId],
    references: [msTeamsCache.id],
  }),
  messages: many(msMessagesCache),
}));

export const msChatsCacheRelations = relations(msChatsCache, ({ one, many }) => ({
  msAccount: one(msGraphAccounts, {
    fields: [msChatsCache.msAccountId],
    references: [msGraphAccounts.id],
  }),
  messages: many(msMessagesCache),
}));

export const msMessagesCacheRelations = relations(msMessagesCache, ({ one }) => ({
  msAccount: one(msGraphAccounts, {
    fields: [msMessagesCache.msAccountId],
    references: [msGraphAccounts.id],
  }),
  chat: one(msChatsCache, {
    fields: [msMessagesCache.chatCacheId],
    references: [msChatsCache.id],
  }),
  channel: one(msChannelsCache, {
    fields: [msMessagesCache.channelCacheId],
    references: [msChannelsCache.id],
  }),
}));

export const msPresenceSettingsRelations = relations(msPresenceSettings, ({ one }) => ({
  msAccount: one(msGraphAccounts, {
    fields: [msPresenceSettings.msAccountId],
    references: [msGraphAccounts.id],
  }),
}));

export const msMeetingsCacheRelations = relations(msMeetingsCache, ({ one }) => ({
  msAccount: one(msGraphAccounts, {
    fields: [msMeetingsCache.msAccountId],
    references: [msGraphAccounts.id],
  }),
}));

// Aliases for snake_case compatibility
export const ms_graph_accounts = msGraphAccounts;
export const ms_teams_cache = msTeamsCache;
export const ms_channels_cache = msChannelsCache;
export const ms_chats_cache = msChatsCache;
export const ms_messages_cache = msMessagesCache;
export const ms_presence_settings = msPresenceSettings;
export const ms_meetings_cache = msMeetingsCache;
