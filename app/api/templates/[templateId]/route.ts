import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { emailTemplates, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/templates/[templateId]
 * Get a specific template
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, params.templateId),
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check permissions: user must own the template or it must be a shared org template
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    const hasAccess = 
      template.userId === user.id || // User owns it
      (template.isShared && template.organizationId === dbUser?.organizationId); // Shared org template

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update last used timestamp
    await db.update(emailTemplates)
      .set({ 
        lastUsedAt: new Date(),
        timesUsed: (template.timesUsed || 0) + 1,
      })
      .where(eq(emailTemplates.id, params.templateId));

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/templates/[templateId]
 * Update a template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, params.templateId),
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Only the owner can edit
    if (template.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { name, description, category, subject, bodyHtml, bodyText, isShared } = await request.json();

    // Extract variables
    const variables = extractVariables(subject, bodyHtml || bodyText);

    // Update template
    const [updated] = await db.update(emailTemplates)
      .set({
        name: name || template.name,
        description: description !== undefined ? description : template.description,
        category: category || template.category,
        subject: subject !== undefined ? subject : template.subject,
        bodyHtml: bodyHtml !== undefined ? bodyHtml : template.bodyHtml,
        bodyText: bodyText !== undefined ? bodyText : template.bodyText,
        variables,
        isShared: isShared !== undefined ? isShared : template.isShared,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, params.templateId))
      .returning();

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/templates/[templateId]
 * Delete a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const template = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, params.templateId),
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Only the owner can delete
    if (template.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.delete(emailTemplates)
      .where(eq(emailTemplates.id, params.templateId));

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

/**
 * Extract variables from text (e.g., {{name}}, {{company}})
 */
function extractVariables(subject?: string, body?: string): string[] {
  const text = `${subject || ''} ${body || ''}`;
  const matches = Array.from(text.matchAll(/\{\{([^}]+)\}\}/g));
  const variables = new Set<string>();
  
  for (const match of matches) {
    variables.add(`{{${match[1].trim()}}}`);
  }
  
  return Array.from(variables);
}

