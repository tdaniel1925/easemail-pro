import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailTemplates, emailTemplateTestSends, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, notFound, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ templateId: string }>;
};

// POST: Send test email (CSRF Protected)
export const POST = withCsrfProtection(async (request: NextRequest, context: RouteContext) => {
  try {
    const { templateId } = await context.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized test email send attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to send test email', {
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
      logger.admin.warn('Template not found for test email', {
        templateId,
        requestedBy: dbUser.email
      });
      return notFound('Template not found');
    }

    // Parse request body
    const body = await request.json();
    const { testEmail, testData } = body;

    if (!testEmail) {
      logger.admin.warn('Test email missing recipient', {
        templateId,
        requestedBy: dbUser.email
      });
      return badRequest('testEmail is required');
    }

    // Replace variables in subject and HTML
    let subject = template.subjectTemplate;
    let html = template.htmlTemplate;

    // Simple variable replacement: {{variableName}}
    if (testData) {
      Object.keys(testData).forEach(key => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        subject = subject.replace(regex, testData[key] || '');
        html = html.replace(regex, testData[key] || '');
      });
    }

    // Send test email
    let success = true;
    let errorMessage = null;

    try {
      await sendEmail({
        to: testEmail,
        subject: `[TEST] ${subject}`,
        html,
      });

      logger.admin.info('Test email sent successfully', {
        templateId,
        templateKey: template.templateKey,
        testEmail,
        sentBy: dbUser.email
      });
    } catch (emailError: any) {
      success = false;
      errorMessage = emailError.message;
      logger.admin.error('Failed to send test email', {
        templateId,
        templateKey: template.templateKey,
        testEmail,
        error: emailError,
        sentBy: dbUser.email
      });
    }

    // Log test send
    await db.insert(emailTemplateTestSends).values({
      templateId: templateId,
      sentTo: testEmail,
      testData,
      sentBy: user.id,
      success,
      errorMessage,
    });

    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email',
        code: 'EMAIL_SEND_FAILED',
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return successResponse({
      testEmailSent: true,
      sentTo: testEmail
    }, `Test email sent to ${testEmail}`);
  } catch (error) {
    logger.api.error('Error sending test email', error);
    return internalError();
  }
});

