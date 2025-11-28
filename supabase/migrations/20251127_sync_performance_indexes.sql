-- Sync Performance Indexes
-- Optimizes email sync queries for Gmail/Outlook-like performance
-- Run with: npx supabase db push

-- ============================================================================
-- EMAIL SYNC INDEXES
-- ============================================================================

-- Index for finding emails by account and received date (most common query)
-- Covers: inbox view, folder views, date sorting
CREATE INDEX IF NOT EXISTS idx_emails_account_received
ON emails (account_id, received_at DESC);

-- Index for finding unread emails quickly
-- Covers: unread count badges, unread filter
CREATE INDEX IF NOT EXISTS idx_emails_account_unread
ON emails (account_id, is_read, received_at DESC)
WHERE is_read = false;

-- Index for folder-specific queries
-- Covers: folder views, folder counts
CREATE INDEX IF NOT EXISTS idx_emails_account_folder_received
ON emails (account_id, folder, received_at DESC);

-- Index for thread grouping
-- Covers: conversation view, thread expansion
CREATE INDEX IF NOT EXISTS idx_emails_account_thread
ON emails (account_id, thread_id, received_at DESC);

-- Index for starred emails
-- Covers: starred view, starred filter
CREATE INDEX IF NOT EXISTS idx_emails_account_starred
ON emails (account_id, is_starred, received_at DESC)
WHERE is_starred = true;

-- Index for provider message ID lookups (webhook processing, deduplication)
-- Covers: webhook handlers, sync deduplication
CREATE INDEX IF NOT EXISTS idx_emails_provider_message_id
ON emails (provider_message_id);

-- Index for from email searches
-- Covers: contact-based search, sender grouping
CREATE INDEX IF NOT EXISTS idx_emails_from_email
ON emails (account_id, from_email, received_at DESC);

-- ============================================================================
-- EMAIL ACCOUNT SYNC INDEXES
-- ============================================================================

-- Index for finding accounts needing sync (cron job optimization)
-- Covers: sync-inactive-accounts cron, restart-stalled-syncs cron
CREATE INDEX IF NOT EXISTS idx_email_accounts_sync_status
ON email_accounts (sync_status, last_synced_at, sync_stopped);

-- Index for finding accounts by user (dashboard view)
CREATE INDEX IF NOT EXISTS idx_email_accounts_user
ON email_accounts (user_id, created_at DESC);

-- Index for finding accounts by provider (rate limit tracking)
CREATE INDEX IF NOT EXISTS idx_email_accounts_provider
ON email_accounts (email_provider, sync_status);

-- Index for webhook lookups by grant ID
CREATE INDEX IF NOT EXISTS idx_email_accounts_grant
ON email_accounts (nylas_grant_id)
WHERE nylas_grant_id IS NOT NULL;

-- ============================================================================
-- WEBHOOK EVENT PROCESSING INDEXES
-- ============================================================================

-- Index for finding unprocessed webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
ON webhook_events (processed, created_at)
WHERE processed = false;

-- Index for cleanup of old processed events
CREATE INDEX IF NOT EXISTS idx_webhook_events_cleanup
ON webhook_events (processed, created_at)
WHERE processed = true;

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Index for the most common inbox query pattern
-- SELECT * FROM emails WHERE account_id = ? AND folder = 'inbox' ORDER BY received_at DESC LIMIT 50
CREATE INDEX IF NOT EXISTS idx_emails_inbox_query
ON emails (account_id, folder, received_at DESC)
WHERE folder = 'inbox';

-- Index for sent folder queries
CREATE INDEX IF NOT EXISTS idx_emails_sent_query
ON emails (account_id, folder, received_at DESC)
WHERE folder = 'sent';

-- ============================================================================
-- PARTIAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for accounts currently syncing (for dashboard status)
CREATE INDEX IF NOT EXISTS idx_email_accounts_syncing
ON email_accounts (id, user_id, sync_progress, synced_email_count)
WHERE sync_status IN ('syncing', 'background_syncing', 'queued');

-- Index for accounts with errors (for health monitoring)
CREATE INDEX IF NOT EXISTS idx_email_accounts_errors
ON email_accounts (id, user_id, last_error, last_synced_at)
WHERE sync_status IN ('error', 'error_permanent', 'paused');

-- ============================================================================
-- ANALYZE TABLES
-- Update statistics for query planner
-- ============================================================================

ANALYZE emails;
ANALYZE email_accounts;
ANALYZE webhook_events;

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES (OPTIONAL)
-- Uncomment and run manually if pg_trgm extension is enabled:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_emails_subject_trgm ON emails USING GIN (subject gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_emails_snippet_trgm ON emails USING GIN (snippet gin_trgm_ops);
-- ============================================================================
