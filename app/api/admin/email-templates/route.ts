import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailTemplates, emailTemplateVersions, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: List all email templates (platform admin only)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized email templates access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to access email templates', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
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

    logger.admin.info('Email templates fetched', {
      requestedBy: dbUser.email,
      templateCount: templates.length
    });

    return successResponse({ templates });
  } catch (error) {
    logger.api.error('Error fetching email templates', error);
    return internalError();
  }
}

// POST: Create a new email template (platform admin only - CSRF Protected)
export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized email template creation attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to create email template', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
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
      logger.admin.warn('Missing required fields for template creation', {
        hasTemplateKey: !!templateKey,
        hasName: !!name,
        hasSubject: !!subjectTemplate,
        hasHtml: !!htmlTemplate,
        requestedBy: dbUser.email
      });
      return badRequest('templateKey, name, subjectTemplate, and htmlTemplate are required');
    }

    // Check if template key already exists
    const existing = await db.query.emailTemplates.findFirst({
      where: eq(emailTemplates.templateKey, templateKey),
    });

    if (existing) {
      logger.admin.warn('Attempted to create duplicate template key', {
        templateKey,
        requestedBy: dbUser.email
      });
      return badRequest('A template with this key already exists');
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

    logger.admin.info('Email template created', {
      templateId: newTemplate.id,
      templateKey,
      name,
      createdBy: dbUser.email
    });

    return successResponse({ template: newTemplate }, 'Email template created successfully', 201);
  } catch (error) {
    logger.api.error('Error creating email template', error);
    return internalError();
  }
});

