import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emails, emailRules } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

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

    const body = await request.json();
    const { ruleId, emailId } = body;

    if (!ruleId || !emailId) {
      return NextResponse.json(
        { success: false, error: 'Missing ruleId or emailId' },
        { status: 400 }
      );
    }

    // Get the rule
    const [rule] = await db
      .select()
      .from(emailRules)
      .where(and(
        eq(emailRules.id, ruleId),
        eq(emailRules.userId, user.id)
      ));

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      );
    }

    // Get the email
    const [email] = await db
      .select()
      .from(emails)
      .where(and(
        eq(emails.id, emailId),
        // @ts-expect-error - userId field exists in runtime
        eq(emails.userId, user.id)
      ));

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }

    // Evaluate conditions
    const conditions = rule.conditions as any[];
    const matchAll = rule.matchAll;

    let matched = false;

    if (matchAll) {
      // AND logic - all conditions must match
      matched = conditions.every(condition => evaluateCondition(email, condition));
    } else {
      // OR logic - any condition can match
      matched = conditions.some(condition => evaluateCondition(email, condition));
    }

    return NextResponse.json({
      success: true,
      matched,
      rule: {
        id: rule.id,
        name: rule.name,
        conditions: rule.conditions,
        actions: rule.actions,
        matchAll: rule.matchAll,
      },
      email: {
        id: email.id,
        subject: email.subject,
        from: email.fromEmail,
      },
    });
  } catch (error) {
    console.error('[Test Rule] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test rule',
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
