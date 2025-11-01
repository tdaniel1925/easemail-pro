import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { ruleTemplates, emailRules, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { CreateRuleFromTemplateRequest } from '@/lib/rules/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/rules/templates
 * List all rule templates
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let whereClause;
    if (category) {
      whereClause = eq(ruleTemplates.category, category);
    }

    const templates = await db.query.ruleTemplates.findMany({
      where: whereClause,
      orderBy: [desc(ruleTemplates.isPopular), desc(ruleTemplates.timesUsed)],
    });

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
 * Create a rule from a template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
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

    // Get the template
    const template = await db.query.ruleTemplates.findFirst({
      where: eq(ruleTemplates.id, body.templateId),
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create rule from template
    const [newRule] = await db.insert(emailRules).values({
      userId: dbUser.id,
      accountId: body.accountId || null,
      name: body.customizations?.name || template.name,
      description: body.customizations?.description || template.description,
      isEnabled: true,
      priority: 100,
      conditions: body.customizations?.conditions || template.conditions,
      actions: body.customizations?.actions || template.actions,
      applyToExisting: false,
      stopProcessing: false,
      runOnServer: true,
      aiGenerated: false,
      aiPrompt: null,
      aiConfidence: null,
      timesTriggered: 0,
      lastTriggered: null,
    }).returning();

    // Increment template usage count
    await db.update(ruleTemplates)
      .set({ timesUsed: template.timesUsed + 1 })
      .where(eq(ruleTemplates.id, template.id));

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

