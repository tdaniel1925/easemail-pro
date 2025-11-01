import { pgTable, uuid, varchar, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users, emailAccounts, emails } from './schema';
import type { RuleConditions, RuleAction, ActionType } from '../rules/types';

// ============================================================================
// Email Rules Table
// ============================================================================

export const emailRules = pgTable('email_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => emailAccounts.id, { onDelete: 'cascade' }), // null = all accounts
  
  // Rule metadata
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  priority: integer('priority').default(100).notNull(), // Lower = higher priority
  
  // Conditions and actions
  conditions: jsonb('conditions').$type<RuleConditions>().notNull(),
  actions: jsonb('actions').$type<RuleAction[]>().notNull(),
  
  // Options
  applyToExisting: boolean('apply_to_existing').default(false).notNull(),
  stopProcessing: boolean('stop_processing').default(false).notNull(),
  runOnServer: boolean('run_on_server').default(true).notNull(),
  
  // AI-powered rules
  aiGenerated: boolean('ai_generated').default(false).notNull(),
  aiPrompt: text('ai_prompt'),
  aiConfidence: integer('ai_confidence'), // 0-100
  
  // Stats
  timesTriggered: integer('times_triggered').default(0).notNull(),
  lastTriggered: timestamp('last_triggered'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('email_rules_user_id_idx').on(table.userId),
  accountIdIdx: index('email_rules_account_id_idx').on(table.accountId),
  isEnabledIdx: index('email_rules_is_enabled_idx').on(table.isEnabled),
  priorityIdx: index('email_rules_priority_idx').on(table.priority),
}));

// ============================================================================
// Rule Executions Table (Logging)
// ============================================================================

export const ruleExecutions = pgTable('rule_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  ruleId: uuid('rule_id').references(() => emailRules.id, { onDelete: 'cascade' }).notNull(),
  emailId: uuid('email_id').references(() => emails.id, { onDelete: 'cascade' }).notNull(),
  
  executedAt: timestamp('executed_at').defaultNow().notNull(),
  success: boolean('success').notNull(),
  error: text('error'),
  actionsPerformed: jsonb('actions_performed').$type<ActionType[]>().notNull(),
}, (table) => ({
  ruleIdIdx: index('rule_executions_rule_id_idx').on(table.ruleId),
  emailIdIdx: index('rule_executions_email_id_idx').on(table.emailId),
  executedAtIdx: index('rule_executions_executed_at_idx').on(table.executedAt),
}));

// ============================================================================
// Scheduled Actions Table (Snooze, Remind, etc.)
// ============================================================================

export const scheduledActions = pgTable('scheduled_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailId: uuid('email_id').references(() => emails.id, { onDelete: 'cascade' }).notNull(),
  ruleId: uuid('rule_id').references(() => emailRules.id, { onDelete: 'set null' }),
  
  actionType: varchar('action_type', { length: 100 }).notNull(),
  actionData: jsonb('action_data').$type<Record<string, any>>().notNull(),
  
  scheduledFor: timestamp('scheduled_for').notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, executing, completed, failed, cancelled
  
  executedAt: timestamp('executed_at'),
  error: text('error'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('scheduled_actions_user_id_idx').on(table.userId),
  ruleIdIdx: index('scheduled_actions_rule_id_idx').on(table.ruleId),
  scheduledForIdx: index('scheduled_actions_scheduled_for_idx').on(table.scheduledFor),
  statusIdx: index('scheduled_actions_status_idx').on(table.status),
}));

// ============================================================================
// Rule Templates Table
// ============================================================================

export const ruleTemplates = pgTable('rule_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // productivity, organization, vip, cleanup, automation
  icon: varchar('icon', { length: 50 }).notNull(),
  
  conditions: jsonb('conditions').$type<RuleConditions>().notNull(),
  actions: jsonb('actions').$type<RuleAction[]>().notNull(),
  
  isPopular: boolean('is_popular').default(false).notNull(),
  timesUsed: integer('times_used').default(0).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('rule_templates_category_idx').on(table.category),
  isPopularIdx: index('rule_templates_is_popular_idx').on(table.isPopular),
}));

// ============================================================================
// Relations
// ============================================================================

export const emailRulesRelations = relations(emailRules, ({ one, many }) => ({
  user: one(users, {
    fields: [emailRules.userId],
    references: [users.id],
  }),
  account: one(emailAccounts, {
    fields: [emailRules.accountId],
    references: [emailAccounts.id],
  }),
  executions: many(ruleExecutions),
  scheduledActions: many(scheduledActions),
}));

export const ruleExecutionsRelations = relations(ruleExecutions, ({ one }) => ({
  rule: one(emailRules, {
    fields: [ruleExecutions.ruleId],
    references: [emailRules.id],
  }),
  email: one(emails, {
    fields: [ruleExecutions.emailId],
    references: [emails.id],
  }),
}));

export const scheduledActionsRelations = relations(scheduledActions, ({ one }) => ({
  user: one(users, {
    fields: [scheduledActions.userId],
    references: [users.id],
  }),
  email: one(emails, {
    fields: [scheduledActions.emailId],
    references: [emails.id],
  }),
  rule: one(emailRules, {
    fields: [scheduledActions.ruleId],
    references: [emailRules.id],
  }),
}));

