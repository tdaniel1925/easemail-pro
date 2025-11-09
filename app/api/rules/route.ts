import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailRules, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { CreateSimpleRuleRequest } from '@/lib/rules/types-simple';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rules
 * List all simplified rules for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get('grantId');
    const enabled = searchParams.get('enabled');

    // Build where clause
    let whereClause = eq(emailRules.userId, dbUser.id);

    if (grantId) {
      whereClause = and(whereClause, eq(emailRules.grantId, grantId)) as any;
    }

    if (enabled !== null) {
      whereClause = and(whereClause, eq(emailRules.isActive, enabled === 'true')) as any;
    }

    // Fetch rules
    const rules = await db.query.emailRules.findMany({
      where: whereClause,
      orderBy: [desc(emailRules.createdAt)],
    });

    return NextResponse.json({
      success: true,
      rules,
    });
  } catch (error) {
    console.error('Error fetching rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rules
 * Create a new simplified rule
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body: CreateSimpleRuleRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.grantId || !body.conditions || !body.actions) {
      return NextResponse.json(
        { error: 'Missing required fields: name, grantId, conditions, actions' },
        { status: 400 }
      );
    }

    // Validate conditions and actions are arrays
    if (!Array.isArray(body.conditions) || !Array.isArray(body.actions)) {
      return NextResponse.json(
        { error: 'Conditions and actions must be arrays' },
        { status: 400 }
      );
    }

    // Create rule
    const [newRule] = await db.insert(emailRules).values({
      userId: dbUser.id,
      grantId: body.grantId,
      name: body.name,
      description: body.description || null,
      isActive: true,
      conditions: body.conditions,
      actions: body.actions,
      matchAll: body.matchAll ?? true,
      stopProcessing: body.stopProcessing ?? false,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      lastExecutedAt: null,
    }).returning();

    // If applyToExisting is true, trigger rule processing for existing emails
    if (body.applyToExisting) {
      // Queue background job to process existing emails
      // TODO: Implement background job system
      console.log('⚠️ Apply to existing emails not yet implemented');
    }

    return NextResponse.json({
      success: true,
      rule: newRule,
    });
  } catch (error) {
    console.error('Error creating rule:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}

