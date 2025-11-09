import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailRules, emails, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { RuleEngine } from '@/lib/rules/rule-engine';
import type { TestRuleResponse } from '@/lib/rules/types';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ ruleId: string }>;
};

/**
 * POST /api/rules/[ruleId]/execute
 * Test a rule on a specific email
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { ruleId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { emailId } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { error: 'Missing emailId' },
        { status: 400 }
      );
    }

    // Get the rule
    const rule = await db.query.emailRules.findFirst({
      where: and(
        eq(emailRules.id, ruleId),
        eq(emailRules.userId, dbUser.id)
      ),
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Get the email
    const email = await db.query.emails.findFirst({
      where: eq(emails.id, emailId),
    });

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Test the rule
    const matched = await RuleEngine.evaluateConditions(email as any, rule.conditions as any);

    const response: TestRuleResponse = {
      success: true,
      matched,
      conditionsEvaluated: [], // TODO: Add detailed condition results
      actionsToExecute: matched ? (rule.actions as any[]).map((a: any) => a.type) : [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error testing rule:', error);
    return NextResponse.json(
      { error: 'Failed to test rule' },
      { status: 500 }
    );
  }
}

