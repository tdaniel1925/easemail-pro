-- Add syncStopped field to track manual sync stops
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS sync_stopped BOOLEAN DEFAULT false;

-- Add retryCount field for auto-retry logic
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Add lastRetryAt field to track retry timing
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMP;

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_email_accounts_sync_stopped ON email_accounts(sync_stopped);

