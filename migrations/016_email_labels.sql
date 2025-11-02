-- Email Labels Table
-- User-defined labels for categorizing emails

-- First, drop the table if it exists (to ensure clean slate)
DROP TABLE IF EXISTS email_labels CASCADE;

CREATE TABLE email_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, name)
);

-- Index for faster lookups
CREATE INDEX idx_email_labels_user_id ON email_labels(user_id);

-- Add foreign key reference to auth.users if needed
-- Uncomment if you want foreign key constraint:
-- ALTER TABLE email_labels ADD CONSTRAINT fk_email_labels_user
--   FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


