-- Add last_activity_at column to track sync progress and detect stuck syncs
-- Migration: 027_add_last_activity_tracking.sql

ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP;

-- Add index for efficient queries on stuck syncs
CREATE INDEX IF NOT EXISTS idx_email_accounts_activity 
ON email_accounts(sync_status, last_activity_at);

-- Add comment
COMMENT ON COLUMN email_accounts.last_activity_at IS 'Timestamp of last sync activity (page processed). Used to detect stuck/silent failures.';

