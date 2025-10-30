-- Nylas Integration Tables Migration
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- EMAIL FOLDERS TABLE
-- Stores folder/label structure synced from Nylas
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  nylas_folder_id VARCHAR(255) NOT NULL,
  parent_folder_id UUID,
  display_name VARCHAR(255) NOT NULL,
  full_path TEXT,
  folder_type VARCHAR(50), -- 'inbox', 'sent', 'drafts', 'trash', 'spam', 'custom'
  unread_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  provider_attributes JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_folders_account_id ON email_folders(account_id);
CREATE INDEX IF NOT EXISTS idx_email_folders_nylas_id ON email_folders(nylas_folder_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_folders_unique ON email_folders(account_id, nylas_folder_id);

-- ============================================================================
-- SYNC LOGS TABLE
-- Monitor and debug sync operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
  sync_type VARCHAR(50), -- 'full', 'delta', 'webhook', 'folder'
  status VARCHAR(50), -- 'started', 'completed', 'failed'
  messages_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMP
);

-- Index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_account_id ON sync_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);

-- ============================================================================
-- WEBHOOK EVENTS TABLE
-- Queue for processing real-time webhook events from Nylas
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
  nylas_webhook_id VARCHAR(255),
  event_type VARCHAR(100), -- 'message.created', 'message.updated', 'message.deleted', etc.
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_account_id ON webhook_events(account_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);

-- ============================================================================
-- UPDATE EXISTING TABLES (if needed)
-- Add Nylas-specific columns to email_accounts table
-- ============================================================================

-- Check if columns exist before adding them
DO $$ 
BEGIN
  -- Add nylasGrantId if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_accounts' AND column_name = 'nylas_grant_id'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN nylas_grant_id VARCHAR(255);
  END IF;

  -- Add nylasEmail if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_accounts' AND column_name = 'nylas_email'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN nylas_email VARCHAR(255);
  END IF;

  -- Add nylasProvider if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_accounts' AND column_name = 'nylas_provider'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN nylas_provider VARCHAR(50);
  END IF;

  -- Add syncCursor if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_accounts' AND column_name = 'sync_cursor'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN sync_cursor TEXT;
  END IF;

  -- Add initialSyncCompleted if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_accounts' AND column_name = 'initial_sync_completed'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN initial_sync_completed BOOLEAN DEFAULT false;
  END IF;

  -- Add webhookId if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_accounts' AND column_name = 'webhook_id'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN webhook_id VARCHAR(255);
  END IF;

  -- Add webhookStatus if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'email_accounts' AND column_name = 'webhook_status'
  ) THEN
    ALTER TABLE email_accounts ADD COLUMN webhook_status VARCHAR(50) DEFAULT 'inactive';
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Secure access to new tables
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE email_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Email Folders Policies
CREATE POLICY "Users can view their own email folders"
  ON email_folders FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own email folders"
  ON email_folders FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own email folders"
  ON email_folders FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own email folders"
  ON email_folders FOR DELETE
  USING (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

-- Sync Logs Policies
CREATE POLICY "Users can view their own sync logs"
  ON sync_logs FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

-- Webhook Events Policies (service role only for inserts)
CREATE POLICY "Users can view their own webhook events"
  ON webhook_events FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM email_accounts WHERE user_id = auth.uid()
    )
  );

-- Allow service role to insert webhook events (for API routes)
CREATE POLICY "Service role can insert webhook events"
  ON webhook_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update webhook events"
  ON webhook_events FOR UPDATE
  USING (true);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for email_folders
DROP TRIGGER IF EXISTS update_email_folders_updated_at ON email_folders;
CREATE TRIGGER update_email_folders_updated_at
  BEFORE UPDATE ON email_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional indexes for emails table (if not exist)
CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON emails(account_id, folder);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_provider_message_id ON emails(provider_message_id);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Nylas Integration Migration Complete!';
  RAISE NOTICE '📦 Created tables: email_folders, sync_logs, webhook_events';
  RAISE NOTICE '🔒 RLS policies enabled for secure access';
  RAISE NOTICE '⚡ Performance indexes created';
  RAISE NOTICE '🎉 Ready to connect email accounts!';
END $$;

