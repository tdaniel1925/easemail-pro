-- Add Email Templates Table
-- Allows users to save and reuse email templates with variable substitution

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- sales, support, personal, marketing, etc.
  
  -- Template content
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  
  -- Variables used in template (for UI hints)
  variables JSONB, -- Array of variable names like ["{{name}}", "{{company}}"]
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Sharing (for org templates)
  is_shared BOOLEAN DEFAULT FALSE, -- Can other org members use this?
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_organization_id ON email_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_shared ON email_templates(is_shared);
CREATE INDEX IF NOT EXISTS idx_email_templates_times_used ON email_templates(times_used DESC);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- Sample templates for new users (optional - can be inserted via seed data)
COMMENT ON TABLE email_templates IS 'Reusable email templates with variable substitution for quick composition';

