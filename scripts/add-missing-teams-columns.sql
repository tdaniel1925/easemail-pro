-- Add Missing Teams Chat Columns
-- Run this in Supabase SQL Editor to add columns that exist in Drizzle schema but not in database

-- teams_chats missing columns
ALTER TABLE teams_chats
ADD COLUMN IF NOT EXISTS last_message_id VARCHAR(255);

ALTER TABLE teams_chats
ADD COLUMN IF NOT EXISTS last_message_sender_id VARCHAR(255);

ALTER TABLE teams_chats
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP;

ALTER TABLE teams_chats
ADD COLUMN IF NOT EXISTS sync_cursor TEXT;

ALTER TABLE teams_chats
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP;

-- Create index on last_message_at if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_teams_chats_last_message ON teams_chats(last_message_at);

SELECT 'Missing columns added successfully!' as result;
