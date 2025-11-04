-- Migration: Add Performance Indexes for Folder Counts
-- Purpose: Optimize folder count queries that use the folders JSONB array
-- Date: 2025-11-04

-- Add GIN index on folders JSONB array for faster containment queries
CREATE INDEX IF NOT EXISTS idx_emails_folders_gin ON emails USING gin(folders);

-- Add index on account_id + folder for faster single-folder queries
CREATE INDEX IF NOT EXISTS idx_emails_account_folder ON emails(account_id, folder) WHERE is_trashed = false AND is_archived = false;

-- Add composite index for common query pattern (account + not trashed + not archived)
CREATE INDEX IF NOT EXISTS idx_emails_active_messages ON emails(account_id, is_trashed, is_archived, is_read);

-- Add index on folder field for case-insensitive searches
CREATE INDEX IF NOT EXISTS idx_emails_folder_lower ON emails(account_id, LOWER(folder)) WHERE is_trashed = false AND is_archived = false;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Folder performance indexes created successfully';
  RAISE NOTICE '📊 Folder count queries will now be significantly faster';
END $$;
