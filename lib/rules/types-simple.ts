/**
 * Simplified Email Rules - "Outlook-Lite" Type Definitions
 *
 * Streamlined type system with:
 * - 5 core condition types
 * - 4 core action types
 * - Simple AND/OR logic
 * - No AI, no complex nesting
 */

// ============================================================================
// Simplified Condition Types (5 core types)
// ============================================================================

export type SimpleConditionType =
  | 'from'          // From email address or domain
  | 'subject'       // Subject line contains
  | 'to'            // Sent to (recipient)
  | 'has_attachments' // Has attachments (boolean)
  | 'importance';   // Email importance/priority

export type SimpleOperator =
  | 'is'            // Exact match
  | 'contains'      // Partial match
  | 'is_domain';    // Domain match (e.g., @gmail.com)

export interface SimpleCondition {
  type: SimpleConditionType;
  operator: SimpleOperator;
  value: string | boolean;
}

// ============================================================================
// Simplified Action Types (4 core types)
// ============================================================================

export type SimpleActionType =
  | 'move'          // Move to folder
  | 'mark_read'     // Mark as read
  | 'star'          // Star/flag message
  | 'delete';       // Delete permanently

export interface SimpleMoveAction {
  type: 'move';
  folderId: string;
  folderName: string; // For display purposes
}

export interface SimpleMarkReadAction {
  type: 'mark_read';
}

export interface SimpleStarAction {
  type: 'star';
}

export interface SimpleDeleteAction {
  type: 'delete';
}

export type SimpleAction =
  | SimpleMoveAction
  | SimpleMarkReadAction
  | SimpleStarAction
  | SimpleDeleteAction;

// ============================================================================
// Rule Definition
// ============================================================================

export interface SimpleEmailRule {
  id: string;
  userId: string;
  grantId: string; // Nylas grant ID for this account

  // Basic info
  name: string;
  description?: string;
  isActive: boolean;

  // Rule logic
  conditions: SimpleCondition[];
  actions: SimpleAction[];
  matchAll: boolean; // true = AND (all must match), false = OR (any can match)
  stopProcessing: boolean; // Don't process further rules if this matches

  // Performance stats
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastExecutedAt: Date | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Rule Activity/Execution Log
// ============================================================================

export interface RuleActivity {
  id: string;
  ruleId: string;
  userId: string;

  // Email context
  messageId: string;
  messageSubject: string | null;
  messageFrom: string | null;

  // Execution result
  status: 'success' | 'error';
  errorMessage: string | null;
  executionTimeMs: number | null;

  executedAt: Date;
}

// ============================================================================
// Rule Templates
// ============================================================================

export type TemplateCategory =
  | 'newsletters'   // Newsletter management
  | 'work'          // Work/boss emails
  | 'cleanup';      // Cleanup/deletion

export interface SimpleRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;

  // Pre-filled rule data
  conditions: SimpleCondition[];
  actions: SimpleAction[];
  matchAll: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateSimpleRuleRequest {
  name: string;
  description?: string;
  grantId: string;
  conditions: SimpleCondition[];
  actions: SimpleAction[];
  matchAll?: boolean;
  stopProcessing?: boolean;
  applyToExisting?: boolean; // Apply to existing emails in inbox
}

export interface UpdateSimpleRuleRequest {
  id: string;
  name?: string;
  description?: string;
  conditions?: SimpleCondition[];
  actions?: SimpleAction[];
  matchAll?: boolean;
  stopProcessing?: boolean;
  isActive?: boolean;
}

export interface CreateRuleFromTemplateRequest {
  templateId: string;
  grantId: string;
  customizations?: {
    name?: string;
    conditions?: Partial<SimpleCondition>[];
    actions?: Partial<SimpleAction>[];
  };
}

// ============================================================================
// Email Message Type (for rule evaluation)
// ============================================================================

export interface EmailMessage {
  id: string;
  grantId: string;

  // Basic fields needed for rule matching
  from: string; // email address
  fromName?: string;
  to: string[]; // array of email addresses
  cc?: string[];
  subject: string;
  body?: string;
  bodyText?: string;

  // Metadata
  hasAttachments: boolean;
  importance?: 'high' | 'normal' | 'low';
  isRead: boolean;
  isStarred: boolean;

  // Folder info
  folderId?: string;
  folderName?: string;

  // Timestamps
  receivedAt: Date;
}

// ============================================================================
// Rule Evaluation Result
// ============================================================================

export interface RuleEvaluationResult {
  ruleId: string;
  matched: boolean;
  conditionResults: {
    condition: SimpleCondition;
    matched: boolean;
  }[];
  actionsToExecute: SimpleAction[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface RuleValidationError {
  field: string;
  message: string;
}

export interface RuleValidationResult {
  valid: boolean;
  errors: RuleValidationError[];
}

// ============================================================================
// User Plan Limits
// ============================================================================

export interface RuleLimits {
  maxRules: number; // 5 for free, 25 for pro, unlimited for enterprise
  currentRules: number;
  canCreateMore: boolean;
}
