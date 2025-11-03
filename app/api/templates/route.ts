import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailTemplates, users } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/templates
 * Get all templates for the current user (personal + shared org templates)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user info to check org membership
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get personal templates + shared org templates
    const templates = await db.query.emailTemplates.findMany({
      where: or(
        eq(emailTemplates.userId, user.id), // Personal templates
        and(
          eq(emailTemplates.isShared, true),
          dbUser.organizationId ? eq(emailTemplates.organizationId, dbUser.organizationId) : undefined
        ) // Shared org templates
      ),
      orderBy: [desc(emailTemplates.timesUsed), desc(emailTemplates.createdAt)],
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
 * POST /api/templates
 * Create a new email template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, category, subject, bodyHtml, bodyText, isShared } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    // Get user info for org membership
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract variables from subject and body
    const variables = extractVariables(subject, bodyHtml || bodyText);

    // Create template
    const [template] = await db.insert(emailTemplates).values({
      userId: user.id,
      organizationId: dbUser.organizationId,
      name,
      description,
      category,
      subject,
      bodyHtml,
      bodyText,
      variables,
      isShared: isShared || false,
      createdByUserId: user.id,
    }).returning();

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

/**
 * Extract variables from text (e.g., {{name}}, {{company}})
 */
function extractVariables(subject?: string, body?: string): string[] {
  const text = `${subject || ''} ${body || ''}`;
  const matches = text.matchAll(/\{\{([^}]+)\}\}/g);
  const variables = new Set<string>();
  
  for (const match of matches) {
    variables.add(`{{${match[1].trim()}}}`);
  }
  
  return Array.from(variables);
}

