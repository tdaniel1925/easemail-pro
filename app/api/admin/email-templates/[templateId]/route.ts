import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { 
  emailTemplates, 
  emailTemplateVersions, 
  emailTemplateTestSends,
  users 
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ templateId: string }>;
};

// GET: Fetch single template with version history
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params;
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

    // Fetch template with versions and test sends
    const template = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, templateId),
      with: {
        versions: {
          orderBy: [desc(emailTemplateVersions.version)],
          with: {
            creator: {
              columns: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
        testSends: {
          orderBy: [desc(emailTemplateTestSends.sentAt)],
          limit: 10,
          with: {
            sender: {
              columns: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
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

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('❌ Error fetching email template:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch email template' 
    }, { status: 500 });
  }
}

// PATCH: Update email template (creates new version)
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params;
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

    // Get existing template
    const existingTemplate = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, templateId),
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      name, 
      description, 
      subjectTemplate, 
      htmlTemplate,
      category,
      triggerEvent,
      requiredVariables,
      changeNotes,
      isActive,
    } = body;

    // Build update object
    const updateData: any = {
      updatedBy: user.id,
      updatedAt: new Date(),
    };

    // Check if content changed (requires new version)
    const contentChanged = 
      (subjectTemplate && subjectTemplate !== existingTemplate.subjectTemplate) ||
      (htmlTemplate && htmlTemplate !== existingTemplate.htmlTemplate);

    if (contentChanged) {
      // Increment version
      updateData.version = existingTemplate.version + 1;
      updateData.subjectTemplate = subjectTemplate || existingTemplate.subjectTemplate;
      updateData.htmlTemplate = htmlTemplate || existingTemplate.htmlTemplate;

      // Create version record
      await db.insert(emailTemplateVersions).values({
        templateId: templateId,
        version: updateData.version,
        subjectTemplate: updateData.subjectTemplate,
        htmlTemplate: updateData.htmlTemplate,
        changeNotes: changeNotes || 'Template updated',
        createdBy: user.id,
      });

      console.log(`📝 Created version ${updateData.version} for template ${existingTemplate.templateKey}`);
    } else {
      // Only metadata changed
      if (subjectTemplate) updateData.subjectTemplate = subjectTemplate;
      if (htmlTemplate) updateData.htmlTemplate = htmlTemplate;
    }

    // Update metadata
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (triggerEvent !== undefined) updateData.triggerEvent = triggerEvent;
    if (requiredVariables !== undefined) updateData.requiredVariables = requiredVariables;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update template
    const [updatedTemplate] = await db.update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, templateId))
      .returning();

    console.log(`✅ Updated email template: ${existingTemplate.templateKey}`);

    return NextResponse.json({ 
      success: true, 
      template: updatedTemplate 
    });
  } catch (error) {
    console.error('❌ Error updating email template:', error);
    return NextResponse.json({ 
      error: 'Failed to update email template' 
    }, { status: 500 });
  }
}

// DELETE: Delete email template
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { templateId } = await context.params;
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

    // Get template
    const template = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, templateId),
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Prevent deletion of default templates
    if (template.isDefault) {
      return NextResponse.json({ 
        error: 'Cannot delete default system templates' 
      }, { status: 400 });
    }

    // Delete template (cascades to versions and test sends)
    await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));

    console.log(`🗑️ Deleted email template: ${template.templateKey}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting email template:', error);
    return NextResponse.json({ 
      error: 'Failed to delete email template' 
    }, { status: 500 });
  }
}

