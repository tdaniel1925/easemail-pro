-- Migration: Add Performance Indexes
-- Description: Add missing indexes to optimize frequently queried fields
-- Date: 2026-02-01

-- Labels table: Optimize fetching user's labels
CREATE INDEX IF NOT EXISTS labels_user_id_idx ON labels(user_id);

-- Note: Email Labels junction table indexes are created in migration 043
-- (The junction table itself is created there)

-- Email Drafts: Optimize draft queries
CREATE INDEX IF NOT EXISTS email_drafts_user_id_idx ON email_drafts(user_id);
CREATE INDEX IF NOT EXISTS email_drafts_account_id_idx ON email_drafts(account_id);
-- Partial index for scheduled drafts only
CREATE INDEX IF NOT EXISTS email_drafts_scheduled_at_idx ON email_drafts(scheduled_at)
  WHERE scheduled_at IS NOT NULL;
-- Optimize sorting by last updated
CREATE INDEX IF NOT EXISTS email_drafts_updated_at_idx ON email_drafts(updated_at DESC);
-- Composite index for user's drafts sorted by update time
CREATE INDEX IF NOT EXISTS email_drafts_user_updated_idx ON email_drafts(user_id, updated_at DESC);

-- Contacts: Optimize email lookups and company filtering
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);
CREATE INDEX IF NOT EXISTS contacts_company_idx ON contacts(company);
-- Composite index for user's contacts by email (prevents duplicate lookups)
CREATE INDEX IF NOT EXISTS contacts_user_email_idx ON contacts(user_id, email);
-- Optimize contact name searches (using full_name and display_name columns)
CREATE INDEX IF NOT EXISTS contacts_full_name_idx ON contacts(full_name);
CREATE INDEX IF NOT EXISTS contacts_display_name_idx ON contacts(display_name);

-- Snooze functionality: Optimize snoozed email queries
-- Partial index for active snoozed emails only
CREATE INDEX IF NOT EXISTS emails_snooze_until_idx ON emails(snooze_until)
  WHERE is_snoozed = true;
-- Composite index for fetching user's snoozed emails
CREATE INDEX IF NOT EXISTS emails_account_snoozed_idx ON emails(account_id, is_snoozed, snooze_until)
  WHERE is_snoozed = true;

-- Email Folders: Optimize folder lookups (if not already indexed)
CREATE INDEX IF NOT EXISTS email_folders_account_id_idx ON email_folders(account_id);
CREATE INDEX IF NOT EXISTS email_folders_folder_type_idx ON email_folders(folder_type);
-- Composite index for account's folders by type
CREATE INDEX IF NOT EXISTS email_folders_account_type_idx ON email_folders(account_id, folder_type);

-- Email Tracking: Optimize tracking event queries
CREATE INDEX IF NOT EXISTS email_tracking_events_tracking_id_idx ON email_tracking_events(tracking_id);
CREATE INDEX IF NOT EXISTS email_tracking_events_created_at_idx ON email_tracking_events(created_at DESC);
-- Composite index for tracking event timelines
CREATE INDEX IF NOT EXISTS email_tracking_events_tracking_created_idx ON email_tracking_events(tracking_id, created_at DESC);

-- Optimize frequently used WHERE clauses on emails table (if not already indexed)
-- Index for fetching unread emails
CREATE INDEX IF NOT EXISTS emails_unread_idx ON emails(account_id, is_read, sent_at DESC)
  WHERE is_read = false;
-- Index for fetching starred emails
CREATE INDEX IF NOT EXISTS emails_starred_idx ON emails(account_id, is_starred, sent_at DESC)
  WHERE is_starred = true;
-- Index for thread queries
CREATE INDEX IF NOT EXISTS emails_thread_id_idx ON emails(thread_id, sent_at DESC);

-- Comments for documentation (commented out to avoid errors if indexes already exist)
-- COMMENT ON INDEX labels_user_id_idx IS 'Optimize fetching all labels for a user';
-- COMMENT ON INDEX email_drafts_user_id_idx IS 'Optimize fetching user drafts';
-- COMMENT ON INDEX email_drafts_scheduled_at_idx IS 'Optimize finding scheduled drafts';
-- COMMENT ON INDEX contacts_email_idx IS 'Optimize contact lookups by email';
-- COMMENT ON INDEX emails_snooze_until_idx IS 'Optimize snoozed email queries';
