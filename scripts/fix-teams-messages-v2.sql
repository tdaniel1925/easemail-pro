-- Fix Teams Messages - Simple version (just add missing columns)
-- Run this in Supabase SQL Editor

-- Add only the columns that might be missing
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS summary TEXT;

-- The column already exists as teams_modified_at, so we're good there

-- Check current columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'teams_messages'
ORDER BY ordinal_position;
