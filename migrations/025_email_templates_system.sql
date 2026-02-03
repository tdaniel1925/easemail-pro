-- Email Templates System Migration
-- Allows platform admins to visually edit and manage email templates

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'new-user-credentials', 'team-invite'
  name VARCHAR(255) NOT NULL, -- Human-readable name
  description TEXT,
  subject_template TEXT NOT NULL, -- Subject line with {{variables}}
  html_template TEXT NOT NULL, -- HTML content with {{variables}}
  
  -- Template metadata
  category VARCHAR(50) DEFAULT 'general', -- 'auth', 'team', 'billing', 'general'
  trigger_event VARCHAR(100), -- When this template is sent
  required_variables JSONB DEFAULT '[]'::jsonb, -- Array of required variable names
  
  -- Versioning and status
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Is this the system default template?
  
  -- Audit fields
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create email_template_versions table (for version history)
CREATE TABLE IF NOT EXISTS email_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Template content at this version
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  
  -- Version metadata
  change_notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(template_id, version)
);

-- Create email_template_test_sends table (track test emails)
CREATE TABLE IF NOT EXISTS email_template_test_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  sent_to VARCHAR(255) NOT NULL,
  test_data JSONB, -- The test variables used
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_template ON email_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_email_template_test_sends_template ON email_template_test_sends(template_id);

-- Insert default templates from existing code
INSERT INTO email_templates (
  template_key, 
  name, 
  description, 
  subject_template, 
  html_template, 
  category, 
  trigger_event, 
  required_variables,
  is_default,
  is_active
) VALUES 
(
  'new-user-credentials',
  'New User Credentials',
  'Sent when an admin creates a new user account',
  'Welcome to {{organizationName}} - Your Account is Ready',
  '<!DOCTYPE html><html><body>Template placeholder - will be updated via migration script</body></html>',
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
  '<!DOCTYPE html><html><body>Template placeholder - will be updated via migration script</body></html>',
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
  '<!DOCTYPE html><html><body>Template placeholder - will be updated via migration script</body></html>',
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
  '<!DOCTYPE html><html><body>Template placeholder - will be updated via migration script</body></html>',
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
  '<!DOCTYPE html><html><body>Template placeholder - will be updated via migration script</body></html>',
  'auth',
  'User signs up',
  '["recipientName", "confirmationLink"]'::jsonb,
  true,
  true
)
ON CONFLICT (template_key) DO NOTHING;

-- Add RLS policies for security
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_test_sends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Platform admins can manage email templates" ON email_templates;
DROP POLICY IF EXISTS "Platform admins can view template versions" ON email_template_versions;
DROP POLICY IF EXISTS "Platform admins can view test sends" ON email_template_test_sends;

-- Only platform admins can manage templates
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

-- Add comments for documentation
COMMENT ON TABLE email_templates IS 'Stores customizable email templates for the system';
COMMENT ON TABLE email_template_versions IS 'Version history for email templates';
COMMENT ON TABLE email_template_test_sends IS 'Tracks test email sends for debugging';
COMMENT ON COLUMN email_templates.template_key IS 'Unique identifier used in code (e.g., new-user-credentials)';
COMMENT ON COLUMN email_templates.required_variables IS 'Array of variable names that must be provided when sending this template';

