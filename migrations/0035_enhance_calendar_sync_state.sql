-- Migration: Enhance calendar_sync_state table to match contacts-v4 sync architecture
-- This adds progress tracking, statistics, and cursor support for robust calendar sync

-- Add new timestamp fields
ALTER TABLE calendar_sync_state
ADD COLUMN IF NOT EXISTS last_successful_sync TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMP;

-- Add cursor for Nylas pagination
ALTER TABLE calendar_sync_state
ADD COLUMN IF NOT EXISTS last_sync_cursor TEXT;

-- Add statistics fields
ALTER TABLE calendar_sync_state
ADD COLUMN IF NOT EXISTS total_events INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS synced_events INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_events INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_events INTEGER DEFAULT 0;

-- Add progress tracking fields
ALTER TABLE calendar_sync_state
ADD COLUMN IF NOT EXISTS progress_current INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_operation VARCHAR(255);

-- Add configuration fields
ALTER TABLE calendar_sync_state
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS auto_sync BOOLEAN DEFAULT TRUE;

-- Update existing rows to set defaults
UPDATE calendar_sync_state
SET
  total_events = COALESCE(total_events, 0),
  synced_events = COALESCE(synced_events, 0),
  pending_events = COALESCE(pending_events, 0),
  error_events = COALESCE(error_events, 0),
  progress_current = COALESCE(progress_current, 0),
  progress_total = COALESCE(progress_total, 0),
  progress_percentage = COALESCE(progress_percentage, 0),
  sync_enabled = COALESCE(sync_enabled, TRUE),
  auto_sync = COALESCE(auto_sync, TRUE)
WHERE
  total_events IS NULL
  OR synced_events IS NULL
  OR pending_events IS NULL
  OR error_events IS NULL
  OR progress_current IS NULL
  OR progress_total IS NULL
  OR progress_percentage IS NULL
  OR sync_enabled IS NULL
  OR auto_sync IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN calendar_sync_state.last_sync_cursor IS 'Nylas cursor for incremental sync pagination';
COMMENT ON COLUMN calendar_sync_state.total_events IS 'Total number of events in calendar';
COMMENT ON COLUMN calendar_sync_state.synced_events IS 'Number of successfully synced events';
COMMENT ON COLUMN calendar_sync_state.pending_events IS 'Number of events pending sync';
COMMENT ON COLUMN calendar_sync_state.error_events IS 'Number of events that failed to sync';
COMMENT ON COLUMN calendar_sync_state.progress_current IS 'Current progress count for active sync';
COMMENT ON COLUMN calendar_sync_state.progress_total IS 'Total items to process in active sync';
COMMENT ON COLUMN calendar_sync_state.progress_percentage IS 'Percentage completion (0-100) of active sync';
COMMENT ON COLUMN calendar_sync_state.current_operation IS 'Description of current sync operation';
