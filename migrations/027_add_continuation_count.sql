-- Migration: Add continuation_count column to email_accounts
-- Purpose: Track sync continuation jobs to prevent infinite loops
-- Date: 2025-11-04

-- Add continuation_count column
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS continuation_count INTEGER DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN email_accounts.continuation_count IS 'Tracks number of background sync continuation jobs to prevent infinite loops (max 50)';

