/**
 * Rules & Automation System - Type Definitions
 * 
 * Comprehensive type system for email rules with support for:
 * - Complex condition matching (AND/OR logic)
 * - Multi-action execution
 * - AI-powered rules
 * - Time-based actions
 * - Cross-account support
 */

// ============================================================================
// Condition Types
// ============================================================================

export type ConditionOperator =
  | 'is'
  | 'is_not'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than'
  | 'in_list'
  | 'not_in_list';

export type ConditionField =
  | 'from_email'
  | 'from_name'
  | 'to_email'
  | 'to_name'
  | 'cc_email'
  | 'bcc_email'
  | 'subject'
  | 'body'
  | 'body_html'
  | 'has_attachments'
  | 'attachment_count'
  | 'attachment_name'
  | 'attachment_type'
  | 'attachment_size'
  | 'is_read'
  | 'is_starred'
  | 'is_flagged'
  | 'label'
  | 'folder'
  | 'received_at'
  | 'day_of_week'
  | 'time_of_day'
  | 'priority'
  | 'sender_in_contacts'
  | 'thread_count'
  | 'ai_category'
  | 'ai_sentiment'
  | 'ai_summary_contains';

export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | boolean | string[];
  caseSensitive?: boolean;
  aiPowered?: boolean; // Use AI to evaluate this condition
}

export type ConditionLogic = 'AND' | 'OR';

export interface RuleConditions {
  logic: ConditionLogic;
  conditions: RuleCondition[];
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionType =
  // Email management
  | 'move_to_folder'
  | 'copy_to_folder'
  | 'add_label'
  | 'remove_label'
  | 'mark_as_read'
  | 'mark_as_unread'
  | 'star'
  | 'unstar'
  | 'flag'
  | 'unflag'
  | 'archive'
  | 'delete'
  | 'mark_as_spam'
  
  // Forwarding & replies
  | 'forward_to'
  | 'redirect_to'
  | 'auto_reply'
  
  // Notifications
  | 'send_notification'
  | 'send_push'
  | 'send_email'
  | 'play_sound'
  
  // Time-based
  | 'snooze_until'
  | 'remind_if_no_reply'
  | 'schedule_send'
  
  // Categorization
  | 'set_category'
  | 'set_priority'
  | 'set_sender_vip'
  
  // Contact management
  | 'add_to_contacts'
  | 'add_contact_tag'
  | 'block_sender'
  
  // Task management
  | 'create_task'
  | 'create_calendar_event'
  
  // AI actions
  | 'ai_summarize'
  | 'ai_categorize'
  | 'ai_extract_action_items'
  | 'ai_suggest_reply'
  
  // Advanced
  | 'run_webhook'
  | 'execute_script';

export interface BaseAction {
  type: ActionType;
}

export interface MoveToFolderAction extends BaseAction {
  type: 'move_to_folder';
  folder: string;
}

export interface CopyToFolderAction extends BaseAction {
  type: 'copy_to_folder';
  folder: string;
}

export interface AddLabelAction extends BaseAction {
  type: 'add_label';
  label: string;
}

export interface RemoveLabelAction extends BaseAction {
  type: 'remove_label';
  label: string;
}

export interface ForwardToAction extends BaseAction {
  type: 'forward_to';
  email: string;
  includeOriginal: boolean;
  addNote?: string;
}

export interface AutoReplyAction extends BaseAction {
  type: 'auto_reply';
  template: string;
  subject?: string;
}

export interface SendNotificationAction extends BaseAction {
  type: 'send_notification';
  title: string;
  message: string;
}

export interface SnoozeUntilAction extends BaseAction {
  type: 'snooze_until';
  date: string;
  time?: string;
}

export interface RemindIfNoReplyAction extends BaseAction {
  type: 'remind_if_no_reply';
  hours: number;
}

export interface SetCategoryAction extends BaseAction {
  type: 'set_category';
  category: string;
}

export interface SetPriorityAction extends BaseAction {
  type: 'set_priority';
  priority: 'urgent' | 'high' | 'normal' | 'low';
}

export interface CreateTaskAction extends BaseAction {
  type: 'create_task';
  title: string;
  description?: string;
  dueDate?: string;
}

export interface RunWebhookAction extends BaseAction {
  type: 'run_webhook';
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: Record<string, any>;
}

export type RuleAction =
  | BaseAction
  | MoveToFolderAction
  | CopyToFolderAction
  | AddLabelAction
  | RemoveLabelAction
  | ForwardToAction
  | AutoReplyAction
  | SendNotificationAction
  | SnoozeUntilAction
  | RemindIfNoReplyAction
  | SetCategoryAction
  | SetPriorityAction
  | CreateTaskAction
  | RunWebhookAction;

// ============================================================================
// Rule Definition
// ============================================================================

export interface EmailRule {
  id: string;
  userId: string;
  accountId: string | null; // null = applies to all accounts
  name: string;
  description: string;
  isEnabled: boolean;
  priority: number; // Lower number = higher priority
  
  // Conditions
  conditions: RuleConditions;
  
  // Actions
  actions: RuleAction[];
  
  // Options
  applyToExisting: boolean; // Apply to existing emails when created
  stopProcessing: boolean; // Don't process further rules if this matches
  runOnServer: boolean; // Server-side vs client-side execution
  
  // AI-powered
  aiGenerated: boolean;
  aiPrompt: string | null;
  aiConfidence: number | null; // 0-100
  
  // Stats
  timesTriggered: number;
  lastTriggered: Date | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Rule Execution
// ============================================================================

export interface RuleExecution {
  id: string;
  ruleId: string;
  emailId: string;
  executedAt: Date;
  success: boolean;
  error: string | null;
  actionsPerformed: ActionType[];
}

// ============================================================================
// Scheduled Actions
// ============================================================================

export type ScheduledActionStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled';

export interface ScheduledAction {
  id: string;
  userId: string;
  emailId: string;
  ruleId: string | null;
  actionType: ActionType;
  actionData: Record<string, any>;
  scheduledFor: Date;
  status: ScheduledActionStatus;
  executedAt: Date | null;
  error: string | null;
  createdAt: Date;
}

// ============================================================================
// Rule Templates
// ============================================================================

export type TemplateCategory = 'productivity' | 'organization' | 'vip' | 'cleanup' | 'automation';

export interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  conditions: RuleConditions;
  actions: RuleAction[];
  isPopular: boolean;
  timesUsed: number;
  createdAt: Date;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateRuleRequest {
  name: string;
  description: string;
  accountId?: string | null;
  conditions: RuleConditions;
  actions: RuleAction[];
  isEnabled?: boolean;
  priority?: number;
  applyToExisting?: boolean;
  stopProcessing?: boolean;
  runOnServer?: boolean;
}

export interface UpdateRuleRequest extends Partial<CreateRuleRequest> {
  id: string;
}

export interface TestRuleRequest {
  ruleId: string;
  emailId: string;
}

export interface TestRuleResponse {
  success: boolean;
  matched: boolean;
  conditionsEvaluated: {
    field: ConditionField;
    operator: ConditionOperator;
    value: any;
    result: boolean;
  }[];
  actionsToExecute: ActionType[];
  error?: string;
}

export interface CreateRuleFromTemplateRequest {
  templateId: string;
  accountId?: string | null;
  customizations?: {
    name?: string;
    description?: string;
    conditions?: Partial<RuleConditions>;
    actions?: Partial<RuleAction>[];
  };
}

export interface RuleAnalytics {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successRate: number;
  topRules: {
    ruleId: string;
    name: string;
    timesTriggered: number;
  }[];
  recentExecutions: RuleExecution[];
  executionsByDay: {
    date: string;
    count: number;
  }[];
}

// ============================================================================
// Helper Types
// ============================================================================

export interface RuleValidationError {
  field: string;
  message: string;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: RuleValidationError[];
}

