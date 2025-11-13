-- Migration: Add calendars and contact_sync_status tables
-- Date: 2025-11-13
-- Description: Add calendar metadata table and contact sync tracking

-- Create calendars table
CREATE TABLE IF NOT EXISTS calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,

  -- Provider info
  provider VARCHAR(50) NOT NULL,
  provider_calendar_id VARCHAR(255) NOT NULL,
  nylas_grant_id VARCHAR(255),

  -- Calendar details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  timezone VARCHAR(100) DEFAULT 'UTC',

  -- Display settings
  color VARCHAR(20) DEFAULT 'blue',
  is_visible BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,

  -- Permissions
  is_read_only BOOLEAN DEFAULT false,
  is_owned BOOLEAN DEFAULT false,

  -- Sync settings
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'idle',
  sync_error TEXT,

  -- Provider-specific metadata
  provider_data JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for calendars table
CREATE INDEX IF NOT EXISTS calendars_user_id_idx ON calendars(user_id);
CREATE INDEX IF NOT EXISTS calendars_account_id_idx ON calendars(email_account_id);
CREATE INDEX IF NOT EXISTS calendars_provider_id_idx ON calendars(provider_calendar_id);
CREATE INDEX IF NOT EXISTS calendars_grant_id_idx ON calendars(nylas_grant_id);
CREATE INDEX IF NOT EXISTS calendars_provider_idx ON calendars(provider);

-- Create contact_sync_status table
CREATE TABLE IF NOT EXISTS contact_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,

  provider VARCHAR(50) NOT NULL,
  nylas_grant_id VARCHAR(255),

  -- Sync tracking
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  last_successful_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,

  -- Sync statistics
  sync_status VARCHAR(50) DEFAULT 'idle',
  sync_error TEXT,
  total_contacts_synced INTEGER DEFAULT 0,
  contacts_added INTEGER DEFAULT 0,
  contacts_updated INTEGER DEFAULT 0,
  contacts_skipped INTEGER DEFAULT 0,

  -- Pagination tokens for incremental sync
  sync_token TEXT,
  page_token TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for contact_sync_status table
CREATE INDEX IF NOT EXISTS contact_sync_user_id_idx ON contact_sync_status(user_id);
CREATE INDEX IF NOT EXISTS contact_sync_account_id_idx ON contact_sync_status(email_account_id);
CREATE INDEX IF NOT EXISTS contact_sync_grant_id_idx ON contact_sync_status(nylas_grant_id);
CREATE INDEX IF NOT EXISTS contact_sync_provider_idx ON contact_sync_status(provider);
