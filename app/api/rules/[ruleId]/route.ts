import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailRules, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { UpdateRuleRequest } from '@/lib/rules/types';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ ruleId: string }>;
};

/**
 * GET /api/rules/[ruleId]
 * Get a specific rule
 */
export async function GET(
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

    const rule = await db.query.emailRules.findFirst({
      where: and(
        eq(emailRules.id, ruleId),
        eq(emailRules.userId, dbUser.id)
      ),
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      rule,
    });
  } catch (error) {
    console.error('Error fetching rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rule' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rules/[ruleId]
 * Update a rule
 */
export async function PUT(
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

    const body: Partial<UpdateRuleRequest> = await request.json();

    // Verify ownership
    const existingRule = await db.query.emailRules.findFirst({
      where: and(
        eq(emailRules.id, ruleId),
        eq(emailRules.userId, dbUser.id)
      ),
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Update rule
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.conditions !== undefined) updateData.conditions = body.conditions;
    if (body.actions !== undefined) updateData.actions = body.actions;
    if (body.applyToExisting !== undefined) updateData.applyToExisting = body.applyToExisting;
    if (body.stopProcessing !== undefined) updateData.stopProcessing = body.stopProcessing;
    if (body.runOnServer !== undefined) updateData.runOnServer = body.runOnServer;
    if (body.accountId !== undefined) updateData.accountId = body.accountId;

    const [updatedRule] = await db.update(emailRules)
      .set(updateData)
      .where(eq(emailRules.id, ruleId))
      .returning();

    return NextResponse.json({
      success: true,
      rule: updatedRule,
    });
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rules/[ruleId]
 * Delete a rule
 */
export async function DELETE(
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

    // Verify ownership
    const existingRule = await db.query.emailRules.findFirst({
      where: and(
        eq(emailRules.id, ruleId),
        eq(emailRules.userId, dbUser.id)
      ),
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Delete rule (cascade will delete executions)
    await db.delete(emailRules)
      .where(eq(emailRules.id, ruleId));

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}

