-- Email Labels Junction Table
-- Many-to-many relationship between emails and labels
-- This allows emails to have multiple labels and labels to be applied to multiple emails

-- Note: Migration 016_email_labels.sql incorrectly created an email_labels table
-- with the wrong structure (labels definition instead of junction table).
-- This migration fixes that by dropping and recreating with the correct structure.

-- Drop the incorrectly created table (if it exists)
-- CASCADE will drop foreign key constraints but not the referenced tables
DROP TABLE IF EXISTS email_labels CASCADE;

-- Ensure the labels table exists first (should be from migration 000 or 016)
CREATE TABLE IF NOT EXISTS labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#4ecdc4',
  icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name)
);

-- Create the correct junction table structure
CREATE TABLE email_labels (
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (email_id, label_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS email_labels_email_id_idx ON email_labels(email_id);
CREATE INDEX IF NOT EXISTS email_labels_label_id_idx ON email_labels(label_id);
CREATE INDEX IF NOT EXISTS email_labels_email_label_idx ON email_labels(email_id, label_id);

-- Row Level Security
ALTER TABLE email_labels ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view email labels for their own emails
CREATE POLICY "Users can view their email labels" ON email_labels FOR SELECT USING (
  email_id IN (
    SELECT e.id FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE ea.user_id = auth.uid()
  )
);

-- Policy: Users can manage email labels for their own emails
CREATE POLICY "Users can manage their email labels" ON email_labels FOR ALL USING (
  email_id IN (
    SELECT e.id FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE ea.user_id = auth.uid()
  )
);

-- Comment for documentation
COMMENT ON TABLE email_labels IS 'Junction table connecting emails to user-defined labels (many-to-many)';
COMMENT ON COLUMN email_labels.email_id IS 'Reference to the email';
COMMENT ON COLUMN email_labels.label_id IS 'Reference to the user-defined label';
