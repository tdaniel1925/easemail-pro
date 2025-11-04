import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailTemplates, emailTemplateVersions, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: List all email templates (platform admin only)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ 
        error: 'Forbidden - Platform admin access required' 
      }, { status: 403 });
    }

    // Fetch all templates with creator info
    const templates = await db.query.emailTemplates.findMany({
      orderBy: [desc(emailTemplates.updatedAt)],
      with: {
        creator: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        updater: {
          columns: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('❌ Error fetching email templates:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch email templates' 
    }, { status: 500 });
  }
}

// POST: Create a new email template (platform admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ 
        error: 'Forbidden - Platform admin access required' 
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      templateKey, 
      name, 
      description, 
      subjectTemplate, 
      htmlTemplate,
      category,
      triggerEvent,
      requiredVariables,
    } = body;

    // Validation
    if (!templateKey || !name || !subjectTemplate || !htmlTemplate) {
      return NextResponse.json({ 
        error: 'templateKey, name, subjectTemplate, and htmlTemplate are required' 
      }, { status: 400 });
    }

    // Check if template key already exists
    const existing = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.templateKey, templateKey),
    });

    if (existing) {
      return NextResponse.json({ 
        error: 'A template with this key already exists' 
      }, { status: 400 });
    }

    // Create new template
    const [newTemplate] = await db.insert(emailTemplates).values({
      templateKey,
      name,
      description,
      subjectTemplate,
      htmlTemplate,
      category: category || 'general',
      triggerEvent,
      requiredVariables: requiredVariables || [],
      version: 1,
      isActive: true,
      isDefault: false,
      createdBy: user.id,
      updatedBy: user.id,
    }).returning();

    // Create initial version record
    await db.insert(emailTemplateVersions).values({
      templateId: newTemplate.id,
      version: 1,
      subjectTemplate,
      htmlTemplate,
      changeNotes: 'Initial template creation',
      createdBy: user.id,
    });

    console.log(`✅ Created email template: ${templateKey}`);

    return NextResponse.json({ 
      success: true, 
      template: newTemplate 
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating email template:', error);
    return NextResponse.json({ 
      error: 'Failed to create email template' 
    }, { status: 500 });
  }
}

