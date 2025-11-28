-- Critical Index for Inbox Performance
-- This index covers the most common inbox query pattern:
-- SELECT * FROM emails WHERE account_id = ? AND folder = ? ORDER BY sent_at DESC

-- Composite index with sort column for instant inbox loading
CREATE INDEX IF NOT EXISTS idx_emails_account_folder_sent
ON emails (account_id, folder, sent_at DESC);

-- Also add index for received_at sorting (some views use this)
CREATE INDEX IF NOT EXISTS idx_emails_account_folder_received_v2
ON emails (account_id, folder, received_at DESC);

-- Update table statistics
ANALYZE emails;
