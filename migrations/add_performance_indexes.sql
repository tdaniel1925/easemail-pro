-- Performance indexes for faster queries in production
-- Run this in your Supabase SQL editor

-- Email accounts indexes
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_sync_status ON email_accounts(sync_status);
CREATE INDEX IF NOT EXISTS idx_email_accounts_nylas_grant_id ON email_accounts(nylas_grant_id);

-- Emails indexes (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_emails_account_id ON emails(account_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_is_starred ON emails(is_starred);
CREATE INDEX IF NOT EXISTS idx_emails_provider_message_id ON emails(provider_message_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON emails(account_id, folder);
CREATE INDEX IF NOT EXISTS idx_emails_account_received ON emails(account_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_account_folder_received ON emails(account_id, folder, received_at DESC);

-- Email folders indexes (table is called email_folders, not folders)
CREATE INDEX IF NOT EXISTS idx_email_folders_account_id ON email_folders(account_id);
CREATE INDEX IF NOT EXISTS idx_email_folders_provider_folder_id ON email_folders(provider_folder_id);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Sync logs indexes
CREATE INDEX IF NOT EXISTS idx_sync_logs_account_id ON sync_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);

-- Text search index for email content (PostgreSQL full-text search)
CREATE INDEX IF NOT EXISTS idx_emails_subject_fts ON emails USING gin(to_tsvector('english', subject));
CREATE INDEX IF NOT EXISTS idx_emails_from_name_fts ON emails USING gin(to_tsvector('english', from_name));

-- Partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_emails_unread ON emails(account_id, received_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_emails_starred ON emails(account_id, received_at DESC) WHERE is_starred = true;

ANALYZE emails;
ANALYZE email_accounts;
ANALYZE email_folders;
ANALYZE contacts;
ANALYZE sync_logs;

