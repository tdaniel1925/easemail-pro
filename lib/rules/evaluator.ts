/**
 * Simplified Rule Evaluation Engine
 *
 * Evaluates if an email matches rule conditions
 * Supports 5 core condition types with simple AND/OR logic
 */

import type {
  SimpleCondition,
  SimpleEmailRule,
  EmailMessage,
  RuleEvaluationResult,
} from './types-simple';

/**
 * Evaluate a single condition against an email
 */
function evaluateCondition(condition: SimpleCondition, email: EmailMessage): boolean {
  const { type, operator, value } = condition;

  switch (type) {
    case 'from': {
      const from = email.from.toLowerCase();
      const checkValue = String(value).toLowerCase();

      if (operator === 'is') {
        return from === checkValue;
      } else if (operator === 'contains') {
        return from.includes(checkValue);
      } else if (operator === 'is_domain') {
        // Extract domain from email (everything after @)
        const domain = from.split('@')[1] || '';
        const checkDomain = checkValue.startsWith('@') ? checkValue.slice(1) : checkValue;
        return domain === checkDomain;
      }
      return false;
    }

    case 'subject': {
      const subject = email.subject.toLowerCase();
      const checkValue = String(value).toLowerCase();

      if (operator === 'is') {
        return subject === checkValue;
      } else if (operator === 'contains') {
        return subject.includes(checkValue);
      }
      return false;
    }

    case 'to': {
      const toList = email.to.map(t => t.toLowerCase());
      const checkValue = String(value).toLowerCase();

      if (operator === 'is') {
        return toList.includes(checkValue);
      } else if (operator === 'contains') {
        return toList.some(t => t.includes(checkValue));
      }
      return false;
    }

    case 'has_attachments': {
      const hasAttachments = email.hasAttachments;
      const checkValue = Boolean(value);
      return hasAttachments === checkValue;
    }

    case 'importance': {
      const importance = email.importance || 'normal';
      const checkValue = String(value).toLowerCase();

      if (operator === 'is') {
        return importance === checkValue;
      }
      return false;
    }

    default:
      console.warn(`[Rule Evaluator] Unknown condition type: ${type}`);
      return false;
  }
}

/**
 * Evaluate all conditions of a rule against an email
 * Returns true if the email matches based on matchAll logic
 */
export function evaluateRule(rule: SimpleEmailRule, email: EmailMessage): RuleEvaluationResult {
  const conditionResults = rule.conditions.map(condition => ({
    condition,
    matched: evaluateCondition(condition, email),
  }));

  // Determine if rule matches based on AND/OR logic
  const matched = rule.matchAll
    ? conditionResults.every(r => r.matched) // ALL must match
    : conditionResults.some(r => r.matched);  // ANY can match

  return {
    ruleId: rule.id,
    matched,
    conditionResults,
    actionsToExecute: matched ? rule.actions : [],
  };
}

/**
 * Evaluate multiple rules against an email in priority order
 * Returns array of matching rules
 * Stops processing if a rule has stopProcessing = true
 */
export function evaluateRules(
  rules: SimpleEmailRule[],
  email: EmailMessage
): RuleEvaluationResult[] {
  const results: RuleEvaluationResult[] = [];

  // Filter only active rules for this email's grant
  const activeRules = rules.filter(
    rule => rule.isActive && rule.grantId === email.grantId
  );

  // Sort by creation date (older rules run first)
  const sortedRules = activeRules.sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  for (const rule of sortedRules) {
    const result = evaluateRule(rule, email);

    if (result.matched) {
      results.push(result);

      // Stop processing further rules if this rule says so
      if (rule.stopProcessing) {
        console.log(`[Rule Evaluator] Stopping after rule "${rule.name}" (stopProcessing=true)`);
        break;
      }
    }
  }

  return results;
}

/**
 * Validate rule conditions
 * Returns array of validation errors
 */
export function validateRuleConditions(conditions: SimpleCondition[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!conditions || conditions.length === 0) {
    errors.push('At least one condition is required');
  }

  conditions.forEach((condition, index) => {
    if (!condition.type) {
      errors.push(`Condition ${index + 1}: type is required`);
    }

    if (!condition.operator) {
      errors.push(`Condition ${index + 1}: operator is required`);
    }

    if (condition.value === undefined || condition.value === null || condition.value === '') {
      if (condition.type !== 'has_attachments') {
        errors.push(`Condition ${index + 1}: value is required`);
      }
    }

    // Type-specific validation
    if (condition.type === 'from' && condition.operator === 'is_domain') {
      const value = String(condition.value);
      if (!value.includes('@') && !value.includes('.')) {
        errors.push(`Condition ${index + 1}: domain must be a valid domain (e.g., gmail.com or @gmail.com)`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get a human-readable description of a condition
 */
export function describeCondition(condition: SimpleCondition): string {
  const { type, operator, value } = condition;

  switch (type) {
    case 'from':
      if (operator === 'is') return `From is ${value}`;
      if (operator === 'contains') return `From contains "${value}"`;
      if (operator === 'is_domain') return `From domain is ${value}`;
      break;

    case 'subject':
      if (operator === 'is') return `Subject is "${value}"`;
      if (operator === 'contains') return `Subject contains "${value}"`;
      break;

    case 'to':
      if (operator === 'is') return `Sent to ${value}`;
      if (operator === 'contains') return `Sent to (contains) "${value}"`;
      break;

    case 'has_attachments':
      return value ? 'Has attachments' : 'No attachments';

    case 'importance':
      return `Importance is ${value}`;
  }

  return 'Unknown condition';
}

/**
 * Get a human-readable description of the entire rule
 */
export function describeRule(rule: SimpleEmailRule): string {
  const logic = rule.matchAll ? 'ALL' : 'ANY';
  const conditionsDesc = rule.conditions.map(c => describeCondition(c)).join(` ${logic} `);
  const actionsDesc = rule.actions.map(a => {
    switch (a.type) {
      case 'move': return `Move to ${a.folderName}`;
      case 'mark_read': return 'Mark as read';
      case 'star': return 'Star message';
      case 'delete': return 'Delete';
      default: return a.type;
    }
  }).join(', ');

  return `When ${conditionsDesc}, then ${actionsDesc}`;
}
