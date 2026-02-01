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
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

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
      logger.admin.warn('Unauthorized email template access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to access email template', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
        templateId
      });
      return forbidden('Platform admin access required');
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
      logger.admin.warn('Email template not found', {
        templateId,
        requestedBy: dbUser.email
      });
      return notFound('Template not found');
    }

    logger.admin.info('Email template fetched', {
      templateId,
      templateKey: template.templateKey,
      requestedBy: dbUser.email
    });

    return successResponse({ template });
  } catch (error) {
    logger.api.error('Error fetching email template', error);
    return internalError();
  }
}

// PATCH: Update email template (creates new version - CSRF Protected)
export const PATCH = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { templateId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized email template update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to update email template', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
        templateId
      });
      return forbidden('Platform admin access required');
    }

    // Get existing template
    const existingTemplate = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, templateId),
    });

    if (!existingTemplate) {
      logger.admin.warn('Email template not found for update', {
        templateId,
        requestedBy: dbUser.email
      });
      return notFound('Template not found');
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

      logger.admin.info('Email template version created', {
        templateId,
        templateKey: existingTemplate.templateKey,
        version: updateData.version,
        changeNotes: changeNotes || 'Template updated',
        updatedBy: dbUser.email
      });
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

    logger.admin.info('Email template updated', {
      templateId,
      templateKey: existingTemplate.templateKey,
      version: updatedTemplate.version,
      contentChanged,
      updatedBy: dbUser.email
    });

    return successResponse({
      template: updatedTemplate
    }, 'Email template updated successfully');
  } catch (error) {
    logger.api.error('Error updating email template', error);
    return internalError();
  }
});

// DELETE: Delete email template (CSRF Protected)
export const DELETE = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { templateId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized email template deletion attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to delete email template', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
        templateId
      });
      return forbidden('Platform admin access required');
    }

    // Get template
    const template = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.id, templateId),
    });

    if (!template) {
      logger.admin.warn('Email template not found for deletion', {
        templateId,
        requestedBy: dbUser.email
      });
      return notFound('Template not found');
    }

    // Prevent deletion of default templates
    if (template.isDefault) {
      logger.security.warn('Attempted to delete default system template', {
        templateId,
        templateKey: template.templateKey,
        attemptedBy: dbUser.email
      });
      return badRequest('Cannot delete default system templates');
    }

    // Delete template (cascades to versions and test sends)
    await db.delete(emailTemplates).where(eq(emailTemplates.id, templateId));

    logger.security.info('Email template deleted', {
      templateId,
      templateKey: template.templateKey,
      deletedBy: dbUser.email
    });

    return successResponse({
      deleted: true
    }, 'Template deleted successfully');
  } catch (error) {
    logger.api.error('Error deleting email template', error);
    return internalError();
  }
});

