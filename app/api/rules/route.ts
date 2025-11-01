import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailRules, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { CreateRuleRequest } from '@/lib/rules/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rules
 * List all rules for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
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
    const accountId = searchParams.get('accountId');
    const enabled = searchParams.get('enabled');

    // Build where clause
    let whereClause = eq(emailRules.userId, dbUser.id);
    
    if (accountId) {
      whereClause = and(whereClause, eq(emailRules.accountId, accountId)) as any;
    }
    
    if (enabled !== null) {
      whereClause = and(whereClause, eq(emailRules.isEnabled, enabled === 'true')) as any;
    }

    // Fetch rules
    const rules = await db.query.emailRules.findMany({
      where: whereClause,
      orderBy: [desc(emailRules.priority), desc(emailRules.createdAt)],
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
 * Create a new rule
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
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

    const body: CreateRuleRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.conditions || !body.actions) {
      return NextResponse.json(
        { error: 'Missing required fields: name, conditions, actions' },
        { status: 400 }
      );
    }

    // Create rule
    const [newRule] = await db.insert(emailRules).values({
      userId: dbUser.id,
      accountId: body.accountId || null,
      name: body.name,
      description: body.description || null,
      isEnabled: body.isEnabled ?? true,
      priority: body.priority ?? 100,
      conditions: body.conditions,
      actions: body.actions,
      applyToExisting: body.applyToExisting ?? false,
      stopProcessing: body.stopProcessing ?? false,
      runOnServer: body.runOnServer ?? true,
      aiGenerated: false,
      aiPrompt: null,
      aiConfidence: null,
      timesTriggered: 0,
      lastTriggered: null,
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

