-- Additional Performance Indexes Based on Code Review
-- Created: 2025-01-15
-- Purpose: Add indexes identified during security and performance audit
-- NOTE: Non-concurrent version for use in Supabase SQL Editor

-- ✅ Composite index for folder count queries (critical for folder-counts.ts)
-- This speeds up queries that filter by account_id, is_trashed, and is_archived
CREATE INDEX IF NOT EXISTS idx_emails_account_folder_active
ON emails(account_id, folder)
WHERE is_trashed = false AND is_archived = false;

-- ✅ Index for faster unread count queries
CREATE INDEX IF NOT EXISTS idx_emails_account_read_status
ON emails(account_id, is_read)
WHERE is_trashed = false AND is_archived = false;

-- ✅ GIN index for faster JSON array searches in folders field
CREATE INDEX IF NOT EXISTS idx_emails_folders_gin
ON emails USING GIN (folders);

-- ✅ Password reset tokens - improve lookup performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token
ON password_reset_tokens(token)
WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
ON password_reset_tokens(expires_at)
WHERE used_at IS NULL;

-- ✅ Contacts V4 search performance indexes
CREATE INDEX IF NOT EXISTS idx_contacts_v4_user_active
ON contacts_v4(user_id, is_deleted)
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_contacts_v4_display_name
ON contacts_v4(display_name)
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_contacts_v4_company
ON contacts_v4(company_name)
WHERE is_deleted = false;

-- ✅ GIN indexes for JSON array searches in contacts
CREATE INDEX IF NOT EXISTS idx_contacts_v4_emails_gin
ON contacts_v4 USING GIN (emails);

CREATE INDEX IF NOT EXISTS idx_contacts_v4_phone_gin
ON contacts_v4 USING GIN (phone_numbers);

CREATE INDEX IF NOT EXISTS idx_contacts_v4_groups_gin
ON contacts_v4 USING GIN (groups);

CREATE INDEX IF NOT EXISTS idx_contacts_v4_tags_gin
ON contacts_v4 USING GIN (tags);

-- ✅ Email drafts - improve draft count queries
CREATE INDEX IF NOT EXISTS idx_email_drafts_account_id
ON email_drafts(account_id);

-- ✅ Webhook events - improve processing queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
ON webhook_events(processed, created_at)
WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_webhook_events_nylas_id
ON webhook_events(nylas_webhook_id);

-- ✅ Update statistics for query planner
ANALYZE emails;
ANALYZE contacts_v4;
ANALYZE password_reset_tokens;
ANALYZE email_drafts;
ANALYZE webhook_events;

-- ✅ Add comments for documentation
COMMENT ON INDEX idx_emails_account_folder_active IS 'Optimizes folder count queries in folder-counts.ts';
COMMENT ON INDEX idx_emails_account_read_status IS 'Optimizes unread count queries';
COMMENT ON INDEX idx_contacts_v4_user_active IS 'Optimizes contact search queries';
COMMENT ON INDEX idx_webhook_events_processed IS 'Optimizes webhook processing queue';
