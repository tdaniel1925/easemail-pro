import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { emailTemplates, emailTemplateTestSends, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email/send';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ templateId: string }>;
};

// POST: Send test email
export async function POST(request: NextRequest, context: RouteContext) {
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

    // Parse request body
    const body = await request.json();
    const { testEmail, testData } = body;

    if (!testEmail) {
      return NextResponse.json({ 
        error: 'testEmail is required' 
      }, { status: 400 });
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

      console.log(`✅ Test email sent to ${testEmail} for template ${template.templateKey}`);
    } catch (emailError: any) {
      success = false;
      errorMessage = emailError.message;
      console.error(`❌ Failed to send test email:`, emailError);
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
        error: 'Failed to send test email',
        details: errorMessage,
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Test email sent to ${testEmail}` 
    });
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    return NextResponse.json({ 
      error: 'Failed to send test email' 
    }, { status: 500 });
  }
}

