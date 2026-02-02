import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Running email templates migration...');

    // Run the migration SQL
    await db.execute(sql`
      -- Create email_templates table
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_key VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        subject_template TEXT NOT NULL,
        html_template TEXT NOT NULL,

        category VARCHAR(50) DEFAULT 'general',
        trigger_event VARCHAR(100),
        required_variables JSONB DEFAULT '[]'::jsonb,

        version INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,

        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_template_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        subject_template TEXT NOT NULL,
        html_template TEXT NOT NULL,
        change_notes TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(template_id, version)
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_template_test_sends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
        sent_to VARCHAR(255) NOT NULL,
        test_data JSONB,
        sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT true,
        error_message TEXT
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
      CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
      CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
      CREATE INDEX IF NOT EXISTS idx_email_template_versions_template ON email_template_versions(template_id);
      CREATE INDEX IF NOT EXISTS idx_email_template_test_sends_template ON email_template_test_sends(template_id);
    `);

    // Insert default templates
    await db.execute(sql`
      INSERT INTO email_templates (
        template_key, name, description, subject_template, html_template,
        category, trigger_event, required_variables, is_default, is_active
      ) VALUES
      (
        'new-user-credentials',
        'New User Credentials',
        'Sent when an admin creates a new user account',
        'Welcome to {{organizationName}} - Your Account is Ready',
        '<!DOCTYPE html><html><body>Template placeholder - will be updated via populate script</body></html>',
        'auth',
        'Admin creates new user',
        '["recipientName", "recipientEmail", "organizationName", "tempPassword", "loginUrl", "expiryDays", "adminName"]'::jsonb,
        true,
        true
      ),
      (
        'team-invite',
        'Team Invitation',
        'Sent when inviting a user to join an organization',
        '{{inviterName}} invited you to join {{organizationName}} on EaseMail',
        '<!DOCTYPE html><html><body>Template placeholder - will be updated via populate script</body></html>',
        'team',
        'Admin invites team member',
        '["organizationName", "inviterName", "inviterEmail", "recipientEmail", "role", "inviteLink", "expiryDate"]'::jsonb,
        true,
        true
      ),
      (
        'password-reset',
        'Password Reset',
        'Sent when a user requests a password reset',
        'Reset Your EaseMail Password',
        '<!DOCTYPE html><html><body>Template placeholder - will be updated via populate script</body></html>',
        'auth',
        'User requests password reset',
        '["recipientName", "resetLink", "expiryHours"]'::jsonb,
        true,
        true
      ),
      (
        'magic-link',
        'Magic Link Login',
        'Sent when a user requests passwordless sign-in',
        'Your Magic Link to Sign In',
        '<!DOCTYPE html><html><body>Template placeholder - will be updated via populate script</body></html>',
        'auth',
        'User requests magic link',
        '["recipientName", "magicLink", "expiryMinutes"]'::jsonb,
        true,
        true
      ),
      (
        'signup-confirmation',
        'Signup Confirmation',
        'Sent when a new user signs up to verify their email',
        'Confirm Your EaseMail Account',
        '<!DOCTYPE html><html><body>Template placeholder - will be updated via populate script</body></html>',
        'auth',
        'User signs up',
        '["recipientName", "confirmationLink"]'::jsonb,
        true,
        true
      )
      ON CONFLICT (template_key) DO NOTHING;
    `);

    await db.execute(sql`
      ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
      ALTER TABLE email_template_versions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE email_template_test_sends ENABLE ROW LEVEL SECURITY;
    `);

    await db.execute(sql`
      DROP POLICY IF EXISTS "Platform admins can manage email templates" ON email_templates;
      CREATE POLICY "Platform admins can manage email templates"
        ON email_templates
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'platform_admin'
          )
        );
    `);

    await db.execute(sql`
      DROP POLICY IF EXISTS "Platform admins can view template versions" ON email_template_versions;
      CREATE POLICY "Platform admins can view template versions"
        ON email_template_versions
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'platform_admin'
          )
        );
    `);

    await db.execute(sql`
      DROP POLICY IF EXISTS "Platform admins can view test sends" ON email_template_test_sends;
      CREATE POLICY "Platform admins can view test sends"
        ON email_template_test_sends
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'platform_admin'
          )
        );
    `);

    console.log('✅ Email templates migration completed');

    return NextResponse.json({
      success: true,
      message: 'Email templates system initialized successfully'
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
