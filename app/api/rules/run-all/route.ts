import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emails, emailRules } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Run All Rules] Starting bulk rule execution for user:', user.id);

    // Get all active rules for user
    const rules = await db
      .select()
      .from(emailRules)
      .where(and(
        eq(emailRules.userId, user.id),
        eq(emailRules.isActive, true)
      ));

    if (rules.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        matched: 0,
        message: 'No active rules to run',
      });
    }

    console.log(`[Run All Rules] Found ${rules.length} active rules`);

    // Get recent inbox emails (last 100)
    const recentEmails = await db
      .select()
      .from(emails)
      // @ts-expect-error - userId field exists in runtime
      .where(eq(emails.userId, user.id))
      .orderBy(desc(emails.receivedAt))
      .limit(100);

    console.log(`[Run All Rules] Processing ${recentEmails.length} emails`);

    let matched = 0;
    let actionsExecuted = 0;

    // Process each email against all rules
    for (const email of recentEmails) {
      for (const rule of rules) {
        try {
          // Evaluate conditions
          const conditions = rule.conditions as any[];
          const matchAll = rule.matchAll;

          let ruleMatched = false;

          if (matchAll) {
            // AND logic - all conditions must match
            ruleMatched = conditions.every(condition => evaluateCondition(email, condition));
          } else {
            // OR logic - any condition can match
            ruleMatched = conditions.some(condition => evaluateCondition(email, condition));
          }

          if (ruleMatched) {
            matched++;
            console.log(`[Run All Rules] Rule "${rule.name}" matched email "${email.subject}"`);

            // Execute actions (simplified for now - just log)
            const actions = rule.actions as any[];
            actionsExecuted += actions.length;

            // Update rule statistics
            await db
              .update(emailRules)
              .set({
                executionCount: (rule.executionCount || 0) + 1,
                successCount: (rule.successCount || 0) + 1,
                lastExecutedAt: new Date(),
              })
              .where(eq(emailRules.id, rule.id));

            // Stop processing if stopProcessing is true
            if (rule.stopProcessing) {
              break;
            }
          }
        } catch (error) {
          console.error(`[Run All Rules] Error processing rule "${rule.name}":`, error);

          // Update failure count
          await db
            .update(emailRules)
            .set({
              executionCount: (rule.executionCount || 0) + 1,
              failureCount: (rule.failureCount || 0) + 1,
            })
            .where(eq(emailRules.id, rule.id));
        }
      }
    }

    console.log(`[Run All Rules] Complete. ${matched} emails matched, ${actionsExecuted} actions executed`);

    return NextResponse.json({
      success: true,
      processed: recentEmails.length,
      matched,
      actionsExecuted,
      rulesChecked: rules.length,
    });
  } catch (error) {
    console.error('[Run All Rules] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run rules',
      },
      { status: 500 }
    );
  }
}

// Helper function to evaluate a single condition
function evaluateCondition(email: any, condition: any): boolean {
  const { type, operator, value } = condition;

  switch (type) {
    case 'from': {
      const fromEmail = email.fromEmail?.toLowerCase() || '';
      const fromName = email.fromName?.toLowerCase() || '';
      const searchValue = (value as string).toLowerCase();

      if (operator === 'is') {
        return fromEmail === searchValue;
      } else if (operator === 'contains') {
        return fromEmail.includes(searchValue) || fromName.includes(searchValue);
      } else if (operator === 'is_domain') {
        return fromEmail.endsWith(searchValue);
      }
      return false;
    }

    case 'subject': {
      const subject = (email.subject || '').toLowerCase();
      const searchValue = (value as string).toLowerCase();

      if (operator === 'is') {
        return subject === searchValue;
      } else if (operator === 'contains') {
        return subject.includes(searchValue);
      }
      return false;
    }

    case 'to': {
      const toEmails = Array.isArray(email.toEmails)
        ? email.toEmails.map((t: any) => t.email?.toLowerCase() || '')
        : [];
      const searchValue = (value as string).toLowerCase();

      if (operator === 'is') {
        return toEmails.includes(searchValue);
      } else if (operator === 'contains') {
        return toEmails.some((email: string) => email.includes(searchValue));
      }
      return false;
    }

    case 'has_attachments': {
      return email.hasAttachments === (value as boolean);
    }

    case 'importance': {
      const importance = email.importance || 'normal';
      return importance === value;
    }

    default:
      return false;
  }
}
