import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { emails, emailAccounts, users } from './schema';

// Email Threads - AI-powered thread grouping
export const emailThreads = pgTable('email_threads', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  
  // Thread identification
  subject: text('subject'), // Normalized subject (without Re:, Fwd:, etc.)
  firstMessageId: varchar('first_message_id', { length: 500 }), // RFC Message-ID of first email
  
  // Thread metadata
  emailCount: integer('email_count').default(0),
  participantCount: integer('participant_count').default(0),
  attachmentCount: integer('attachment_count').default(0),
  
  // Status
  isRead: boolean('is_read').default(false), // All emails in thread read
  isStarred: boolean('is_starred').default(false), // At least one starred
  isArchived: boolean('is_archived').default(false),
  isMuted: boolean('is_muted').default(false),
  hasUnread: boolean('has_unread').default(false),
  
  // AI-powered features
  aiSummary: text('ai_summary'), // Overall thread summary
  aiSummaryGeneratedAt: timestamp('ai_summary_generated_at'),
  aiCategory: varchar('ai_category', { length: 100 }), // 'discussion', 'decision', 'info', 'action'
  aiSentiment: varchar('ai_sentiment', { length: 50 }), // 'positive', 'neutral', 'negative', 'mixed'
  aiPriority: varchar('ai_priority', { length: 20 }), // 'urgent', 'high', 'normal', 'low'
  
  // Thread intelligence
  decisions: jsonb('decisions').$type<Array<{
    decision: string;
    madeBy: string;
    madeAt: string;
    emailId: string;
  }>>(),
  
  actionItems: jsonb('action_items').$type<Array<{
    item: string;
    assignedTo?: string;
    dueDate?: string;
    status: 'pending' | 'completed';
    emailId: string;
  }>>(),
  
  keyTopics: jsonb('key_topics').$type<string[]>(), // ['budget', 'timeline', 'design']
  
  mentions: jsonb('mentions').$type<Array<{
    type: 'person' | 'date' | 'money' | 'link' | 'company';
    value: string;
    emailId: string;
  }>>(),
  
  // Timeline
  firstEmailAt: timestamp('first_email_at'),
  lastEmailAt: timestamp('last_email_at'),
  lastActivityAt: timestamp('last_activity_at'),
  
  // Cross-account support
  accountIds: jsonb('account_ids').$type<string[]>(), // All accounts involved in this thread
  
  // Prediction & recommendation
  needsReply: boolean('needs_reply').default(false), // AI predicts you should reply
  predictedNextAction: varchar('predicted_next_action', { length: 100 }), // 'reply', 'schedule', 'archive'
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('threads_user_id_idx').on(table.userId),
  firstMessageIdIdx: index('threads_first_message_id_idx').on(table.firstMessageId),
  lastActivityIdx: index('threads_last_activity_idx').on(table.lastActivityAt),
  needsReplyIdx: index('threads_needs_reply_idx').on(table.needsReply),
}));

// Thread Participants - Who's involved in each thread
export const threadParticipants = pgTable('thread_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').references(() => emailThreads.id, { onDelete: 'cascade' }).notNull(),
  
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  
  // Participation metrics
  messageCount: integer('message_count').default(0),
  firstParticipatedAt: timestamp('first_participated_at'),
  lastParticipatedAt: timestamp('last_participated_at'),
  
  // Role in thread
  isInitiator: boolean('is_initiator').default(false),
  isRecipient: boolean('is_recipient').default(false),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  threadIdIdx: index('thread_participants_thread_id_idx').on(table.threadId),
  emailIdx: index('thread_participants_email_idx').on(table.email),
}));

// Thread Timeline Events - Visual timeline of thread activity
export const threadTimelineEvents = pgTable('thread_timeline_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  threadId: uuid('thread_id').references(() => emailThreads.id, { onDelete: 'cascade' }).notNull(),
  emailId: uuid('email_id').notNull(),
  
  // Event details
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'email_sent', 'email_received', 'decision_made', 'action_created'
  actor: varchar('actor', { length: 255 }), // Who did it
  actorEmail: varchar('actor_email', { length: 255 }),
  
  summary: text('summary'), // "John approved the budget"
  content: text('content'), // Brief excerpt or detail
  
  // Metadata
  metadata: jsonb('metadata').$type<{
    attachments?: string[];
    mentions?: string[];
    sentiment?: string;
    importance?: number;
  }>(),
  
  occurredAt: timestamp('occurred_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  threadIdIdx: index('timeline_thread_id_idx').on(table.threadId),
  occurredAtIdx: index('timeline_occurred_at_idx').on(table.occurredAt),
}));

// Relations
export const emailThreadsRelations = relations(emailThreads, ({ many }) => ({
  participants: many(threadParticipants),
  timelineEvents: many(threadTimelineEvents),
}));

export const threadParticipantsRelations = relations(threadParticipants, ({ one }) => ({
  thread: one(emailThreads, {
    fields: [threadParticipants.threadId],
    references: [emailThreads.id],
  }),
}));

export const threadTimelineEventsRelations = relations(threadTimelineEvents, ({ one }) => ({
  thread: one(emailThreads, {
    fields: [threadTimelineEvents.threadId],
    references: [emailThreads.id],
  }),
}));

