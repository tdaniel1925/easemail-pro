/**
 * Rules Engine - Core Rule Processing Logic
 * 
 * Evaluates email against rules and executes matching actions
 */

import { db } from '../db/drizzle';
import { emails, emailRules, ruleExecutions, scheduledActions, emailAccounts, emailFolders } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nylas } from '../email/nylas-client';
import type {
  EmailRule,
  RuleCondition,
  RuleConditions,
  RuleAction,
  ActionType,
  ConditionField,
  ConditionOperator,
} from './types';

interface Email {
  id: string;
  accountId: string;
  fromEmail: string | null;
  fromName: string | null;
  toEmails: Array<{ email: string; name?: string }> | null;
  ccEmails: Array<{ email: string; name?: string }> | null;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  hasAttachments: boolean | null;
  attachmentsCount: number | null;
  attachments: Array<{
    id: string;
    filename: string;
    size: number;
    contentType: string;
  }> | null;
  isRead: boolean | null;
  isStarred: boolean | null;
  isFlagged: boolean | null;
  labels: string[] | null;
  folder: string | null;
  receivedAt: Date | null;
  priority: string | null;
  aiCategory: string | null;
  aiSentiment: string | null;
  aiSummary: string | null;
}

export class RuleEngine {
  /**
   * Main entry point: Process an email against all active rules
   */
  static async processEmail(email: Email, userId: string): Promise<void> {
    try {
      // Get all active rules for this user
      const rules = await db.query.emailRules.findMany({
        where: and(
          eq(emailRules.userId, userId),
          eq(emailRules.isActive, true)
        ),
      });

      console.log(`📋 Processing ${rules.length} rules for email ${email.id}`);

      // Process each rule
      for (const rule of rules) {
        try {
          // Check if email matches rule conditions
          const matches = await this.evaluateConditions(email, rule.conditions as RuleConditions);

          if (matches) {
            console.log(`✅ Rule "${rule.name}" matched email ${email.id}`);

            // Execute rule actions
            const actionsPerformed = await this.executeActions(email, rule.actions as RuleAction[], userId);

            // Log execution
            await this.logExecution(rule.id, email.id, true, actionsPerformed);

            // Update rule stats
            await this.updateRuleStats(rule.id);

            // Stop processing if rule says so
            if (rule.stopProcessing) {
              console.log(`🛑 Rule "${rule.name}" stopped further processing`);
              break;
            }
          }
        } catch (error) {
          console.error(`❌ Error processing rule "${rule.name}":`, error);
          await this.logExecution(rule.id, email.id, false, [], error instanceof Error ? error.message : 'Unknown error');
        }
      }
    } catch (error) {
      console.error('❌ Error in rule engine:', error);
    }
  }

  /**
   * Evaluate all conditions for a rule (with AND/OR logic)
   */
  static async evaluateConditions(email: Email, conditions: RuleConditions): Promise<boolean> {
    const { logic, conditions: conditionList } = conditions;

    if (conditionList.length === 0) {
      return false;
    }

    const results = await Promise.all(
      conditionList.map(condition => this.evaluateCondition(email, condition))
    );

    if (logic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  /**
   * Evaluate a single condition
   */
  static async evaluateCondition(email: Email, condition: RuleCondition): Promise<boolean> {
    const { field, operator, value, caseSensitive = false } = condition;

    // Get the actual email field value
    const emailValue = this.getEmailFieldValue(email, field);

    // Handle null/undefined email values
    if (emailValue === null || emailValue === undefined) {
      return operator === 'is_empty' || operator === 'is_not';
    }

    // Evaluate based on operator
    switch (operator) {
      case 'is':
        return this.compareValues(emailValue, value, caseSensitive, '===');
      
      case 'is_not':
        return !this.compareValues(emailValue, value, caseSensitive, '===');
      
      case 'contains':
        return this.stringContains(emailValue, value as string, caseSensitive);
      
      case 'not_contains':
        return !this.stringContains(emailValue, value as string, caseSensitive);
      
      case 'starts_with':
        return this.stringStartsWith(emailValue, value as string, caseSensitive);
      
      case 'ends_with':
        return this.stringEndsWith(emailValue, value as string, caseSensitive);
      
      case 'matches_regex':
        return this.matchesRegex(emailValue, value as string);
      
      case 'is_empty':
        return !emailValue || (typeof emailValue === 'string' && emailValue.trim() === '');
      
      case 'is_not_empty':
        return !!emailValue && (typeof emailValue !== 'string' || emailValue.trim() !== '');
      
      case 'greater_than':
        return Number(emailValue) > Number(value);
      
      case 'less_than':
        return Number(emailValue) < Number(value);
      
      case 'in_list':
        return Array.isArray(value) && value.some(v => this.compareValues(emailValue, v, caseSensitive, '==='));
      
      case 'not_in_list':
        return !Array.isArray(value) || !value.some(v => this.compareValues(emailValue, v, caseSensitive, '==='));
      
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Get the value of an email field for evaluation
   */
  static getEmailFieldValue(email: Email, field: ConditionField): any {
    switch (field) {
      case 'from_email':
        return email.fromEmail;
      case 'from_name':
        return email.fromName;
      case 'to_email':
        return email.toEmails?.map(t => t.email).join(', ');
      case 'to_name':
        return email.toEmails?.map(t => t.name).join(', ');
      case 'cc_email':
        return email.ccEmails?.map(c => c.email).join(', ');
      case 'subject':
        return email.subject;
      case 'body':
        return email.bodyText || email.bodyHtml;
      case 'body_html':
        return email.bodyHtml;
      case 'has_attachments':
        return email.hasAttachments;
      case 'attachment_count':
        return email.attachmentsCount || 0;
      case 'attachment_name':
        return email.attachments?.map(a => a.filename).join(', ');
      case 'attachment_type':
        return email.attachments?.map(a => a.contentType).join(', ');
      case 'attachment_size':
        return email.attachments?.reduce((sum, a) => sum + a.size, 0) || 0;
      case 'is_read':
        return email.isRead;
      case 'is_starred':
        return email.isStarred;
      case 'is_flagged':
        return email.isFlagged;
      case 'label':
        return email.labels?.join(', ');
      case 'folder':
        return email.folder;
      case 'received_at':
        return email.receivedAt;
      case 'day_of_week':
        return email.receivedAt ? email.receivedAt.getDay() : null;
      case 'time_of_day':
        return email.receivedAt ? email.receivedAt.getHours() : null;
      case 'priority':
        return email.priority;
      case 'ai_category':
        return email.aiCategory;
      case 'ai_sentiment':
        return email.aiSentiment;
      case 'ai_summary_contains':
        return email.aiSummary;
      default:
        return null;
    }
  }

  /**
   * Execute all actions for a matched rule
   */
  static async executeActions(email: Email, actions: RuleAction[], userId: string): Promise<ActionType[]> {
    const performed: ActionType[] = [];

    for (const action of actions) {
      try {
        await this.executeAction(email, action, userId);
        performed.push(action.type);
      } catch (error) {
        console.error(`❌ Error executing action ${action.type}:`, error);
      }
    }

    return performed;
  }

  /**
   * Execute a single action
   */
  static async executeAction(email: Email, action: RuleAction, userId: string): Promise<void> {
    console.log(`🎬 Executing action: ${action.type}`);

    switch (action.type) {
      case 'move_to_folder':
        const targetFolderName = (action as any).folder;
        
        // Update database immediately
        await db.update(emails)
          .set({ folder: targetFolderName, updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        
        // Sync with Nylas (move on email provider's server)
        try {
          // Get account to retrieve grantId
          const account = await db.query.emailAccounts.findFirst({
            where: eq(emailAccounts.id, email.accountId),
          });
          
          const emailProviderMessageId = (email as any).providerMessageId as string | undefined;
          
          if (account && account.nylasGrantId && emailProviderMessageId) {
            // Find the Nylas folder ID by displayName
            const targetFolder = await db.query.emailFolders.findFirst({
              where: and(
                eq(emailFolders.accountId, account.id),
                eq(emailFolders.displayName, targetFolderName)
              ),
            });
            
            if (targetFolder && targetFolder.nylasFolderId) {
              console.log(`📁 Moving email to folder in Nylas: ${targetFolderName} (ID: ${targetFolder.nylasFolderId})`);
              
              // Call Nylas API to move the message
              await nylas.messages.update({
                identifier: account.nylasGrantId,
                messageId: (email as any).providerMessageId,
                requestBody: {
                  folders: [targetFolder.nylasFolderId],
                },
              });
              
              console.log(`✅ Email moved in Nylas successfully`);
            } else {
              console.warn(`⚠️ Folder "${targetFolderName}" not found in Nylas folders for this account`);
            }
          }
        } catch (nylasError) {
          console.error('❌ Nylas folder move error:', nylasError);
          // Don't throw - database update already succeeded, Nylas sync is best-effort
        }
        break;

      case 'add_label':
        const currentLabels = email.labels || [];
        if (!currentLabels.includes((action as any).label)) {
          await db.update(emails)
            .set({ labels: [...currentLabels, (action as any).label], updatedAt: new Date() })
            .where(eq(emails.id, email.id));
        }
        break;

      case 'remove_label':
        const labels = email.labels || [];
        await db.update(emails)
          .set({ 
            labels: labels.filter(l => l !== (action as any).label),
            updatedAt: new Date()
          })
          .where(eq(emails.id, email.id));
        break;

      case 'mark_as_read':
        await db.update(emails)
          .set({ isRead: true, updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        
        // Sync with Nylas
        try {
          const account = await db.query.emailAccounts.findFirst({
            where: eq(emailAccounts.id, email.accountId),
          });
          if (account && account.nylasGrantId && (email as any).providerMessageId) {
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: (email as any).providerMessageId,
              requestBody: { unread: false },
            });
          }
        } catch (nylasError) {
          console.error('❌ Nylas mark_as_read error:', nylasError);
        }
        break;

      case 'mark_as_unread':
        await db.update(emails)
          .set({ isRead: false, updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        
        // Sync with Nylas
        try {
          const account = await db.query.emailAccounts.findFirst({
            where: eq(emailAccounts.id, email.accountId),
          });
          if (account && account.nylasGrantId && (email as any).providerMessageId) {
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: (email as any).providerMessageId,
              requestBody: { unread: true },
            });
          }
        } catch (nylasError) {
          console.error('❌ Nylas mark_as_unread error:', nylasError);
        }
        break;

      case 'star':
        await db.update(emails)
          .set({ isStarred: true, updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        
        // Sync with Nylas
        try {
          const account = await db.query.emailAccounts.findFirst({
            where: eq(emailAccounts.id, email.accountId),
          });
          if (account && account.nylasGrantId && (email as any).providerMessageId) {
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: (email as any).providerMessageId,
              requestBody: { starred: true },
            });
          }
        } catch (nylasError) {
          console.error('❌ Nylas star error:', nylasError);
        }
        break;

      case 'unstar':
        await db.update(emails)
          .set({ isStarred: false, updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        
        // Sync with Nylas
        try {
          const account = await db.query.emailAccounts.findFirst({
            where: eq(emailAccounts.id, email.accountId),
          });
          if (account && account.nylasGrantId && (email as any).providerMessageId) {
            await nylas.messages.update({
              identifier: account.nylasGrantId,
              messageId: (email as any).providerMessageId,
              requestBody: { starred: false },
            });
          }
        } catch (nylasError) {
          console.error('❌ Nylas unstar error:', nylasError);
        }
        break;

      case 'flag':
        await db.update(emails)
          .set({ isFlagged: true, updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        break;

      case 'unflag':
        await db.update(emails)
          .set({ isFlagged: false, updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        break;

      case 'archive':
        await db.update(emails)
          .set({ isArchived: true, folder: 'archive', updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        break;

      case 'delete':
        await db.update(emails)
          .set({ isTrashed: true, folder: 'trash', updatedAt: new Date() })
          .where(eq(emails.id, email.id));
        break;

      case 'snooze_until':
        // Schedule action for later
        await db.insert(scheduledActions).values({
          userId,
          emailId: email.id,
          ruleId: null,
          actionType: 'snooze_until',
          actionData: action,
          scheduledFor: new Date((action as any).date),
          status: 'pending',
        });
        break;

      // Placeholder for other actions
      default:
        console.log(`⚠️ Action ${action.type} not yet implemented`);
    }
  }

  /**
   * Log rule execution
   */
  static async logExecution(
    ruleId: string,
    emailId: string,
    success: boolean,
    actionsPerformed: ActionType[],
    error: string | null = null
  ): Promise<void> {
    await db.insert(ruleExecutions).values({
      ruleId,
      emailId,
      executedAt: new Date(),
      success,
      error,
      actionsPerformed,
    });
  }

  /**
   * Update rule statistics
   */
  static async updateRuleStats(ruleId: string): Promise<void> {
    await db.execute(sql`
      UPDATE email_rules
      SET times_triggered = times_triggered + 1,
          last_triggered = NOW(),
          updated_at = NOW()
      WHERE id = ${ruleId}
    `);
  }

  // Helper methods

  private static compareValues(a: any, b: any, caseSensitive: boolean, operator: '===' | '!=='): boolean {
    const aStr = String(a || '');
    const bStr = String(b || '');
    
    if (caseSensitive) {
      return operator === '===' ? aStr === bStr : aStr !== bStr;
    } else {
      return operator === '===' ? aStr.toLowerCase() === bStr.toLowerCase() : aStr.toLowerCase() !== bStr.toLowerCase();
    }
  }

  private static stringContains(str: any, search: string, caseSensitive: boolean): boolean {
    const haystack = String(str || '');
    const needle = String(search || '');
    
    if (caseSensitive) {
      return haystack.includes(needle);
    } else {
      return haystack.toLowerCase().includes(needle.toLowerCase());
    }
  }

  private static stringStartsWith(str: any, search: string, caseSensitive: boolean): boolean {
    const haystack = String(str || '');
    const needle = String(search || '');
    
    if (caseSensitive) {
      return haystack.startsWith(needle);
    } else {
      return haystack.toLowerCase().startsWith(needle.toLowerCase());
    }
  }

  private static stringEndsWith(str: any, search: string, caseSensitive: boolean): boolean {
    const haystack = String(str || '');
    const needle = String(search || '');
    
    if (caseSensitive) {
      return haystack.endsWith(needle);
    } else {
      return haystack.toLowerCase().endsWith(needle.toLowerCase());
    }
  }

  private static matchesRegex(str: any, pattern: string): boolean {
    try {
      const regex = new RegExp(pattern);
      return regex.test(String(str || ''));
    } catch (error) {
      console.error('Invalid regex pattern:', pattern);
      return false;
    }
  }
}

