-- Fix Teams Messages Schema Mismatch
-- Run this in Supabase SQL Editor

-- Add missing columns to teams_messages
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS teams_modified_at TIMESTAMP;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Rename columns if they have wrong names (migration used different names)
-- First check if the old columns exist
DO $$
BEGIN
    -- Rename teams_last_modified_at to teams_modified_at if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'teams_messages' AND column_name = 'teams_last_modified_at') THEN
        ALTER TABLE teams_messages RENAME COLUMN teams_last_modified_at TO teams_modified_at;
        RAISE NOTICE 'Renamed teams_last_modified_at to teams_modified_at';
    END IF;

    -- Rename teams_last_edited_at to edited_at if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'teams_messages' AND column_name = 'teams_last_edited_at') THEN
        ALTER TABLE teams_messages RENAME COLUMN teams_last_edited_at TO edited_at;
        RAISE NOTICE 'Renamed teams_last_edited_at to edited_at';
    END IF;
END $$;

-- Make sender_id nullable (in case it's NOT NULL and causing issues)
ALTER TABLE teams_messages
ALTER COLUMN sender_id DROP NOT NULL;

SELECT 'Teams messages schema fixed!' as result;
