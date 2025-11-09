import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailRules, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { CreateRuleFromTemplateRequest } from '@/lib/rules/types-simple';
import {
  SIMPLE_RULE_TEMPLATES,
  getTemplatesByCategory,
  getTemplateById
} from '@/lib/rules/templates-simple';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rules/templates
 * List all simplified rule templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const templates = category
      ? getTemplatesByCategory(category)
      : SIMPLE_RULE_TEMPLATES;

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rules/templates
 * Create a simplified rule from a template
 */
export async function POST(request: NextRequest) {
  try {
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

    const body: CreateRuleFromTemplateRequest = await request.json();

    if (!body.grantId) {
      return NextResponse.json(
        { error: 'Missing required field: grantId' },
        { status: 400 }
      );
    }

    // Get the template
    const template = getTemplateById(body.templateId);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Merge template with customizations
    const conditions = body.customizations?.conditions
      ? template.conditions.map((cond, i) => ({
          ...cond,
          ...(body.customizations?.conditions?.[i] || {})
        }))
      : template.conditions;

    const actions = body.customizations?.actions
      ? template.actions.map((action, i) => ({
          ...action,
          ...(body.customizations?.actions?.[i] || {})
        }))
      : template.actions;

    // Create rule from template
    const [newRule] = await db.insert(emailRules).values({
      userId: dbUser.id,
      grantId: body.grantId,
      name: body.customizations?.name || template.name,
      description: template.description,
      isActive: true,
      conditions,
      actions,
      matchAll: template.matchAll,
      stopProcessing: false,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      lastExecutedAt: null,
    }).returning();

    return NextResponse.json({
      success: true,
      rule: newRule,
    });
  } catch (error) {
    console.error('Error creating rule from template:', error);
    return NextResponse.json(
      { error: 'Failed to create rule from template' },
      { status: 500 }
    );
  }
}

