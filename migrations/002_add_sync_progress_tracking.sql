-- Add sync progress tracking fields to email_accounts table
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS total_email_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS synced_email_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sync_progress INTEGER DEFAULT 0;

-- Update sync_status to include new statuses
COMMENT ON COLUMN email_accounts.sync_status IS 'Sync status: idle, syncing, completed, error, background_syncing';
COMMENT ON COLUMN email_accounts.sync_cursor IS 'Nylas pagination token for incremental sync';
COMMENT ON COLUMN email_accounts.sync_progress IS 'Sync progress percentage (0-100)';

