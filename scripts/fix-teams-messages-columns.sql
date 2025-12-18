-- Fix Teams Messages Missing Columns
-- Run this in Supabase SQL Editor
-- This adds all potentially missing columns to teams_messages table

-- First, let's see what columns currently exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'teams_messages'
-- ORDER BY ordinal_position;

-- Add missing columns (IF NOT EXISTS prevents errors if they already exist)

-- Required reference columns
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS teams_account_id UUID REFERENCES teams_accounts(id) ON DELETE CASCADE;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS chat_id UUID REFERENCES teams_chats(id) ON DELETE CASCADE;

-- Teams identifiers
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS teams_message_id VARCHAR(255);

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS teams_chat_id VARCHAR(255);

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS reply_to_message_id VARCHAR(255);

-- Sender info
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS sender_id VARCHAR(255);

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255);

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS sender_email VARCHAR(255);

-- Message content
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS body TEXT;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS body_type VARCHAR(20) DEFAULT 'html';

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS subject VARCHAR(500);

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS summary TEXT;

-- Message type
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'message';

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS importance VARCHAR(20) DEFAULT 'normal';

-- Attachments
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT false;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Mentions & Reactions
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS mentions JSONB;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS reactions JSONB;

-- Status flags
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS teams_last_edited_at TIMESTAMP;

-- Timestamps from Teams
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS teams_created_at TIMESTAMP;

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS teams_last_modified_at TIMESTAMP;

-- Local timestamps
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Now update any NULL values for NOT NULL columns
-- Set teams_account_id from the chat's teams_account_id
UPDATE teams_messages tm
SET teams_account_id = tc.teams_account_id
FROM teams_chats tc
WHERE tm.chat_id = tc.id
AND tm.teams_account_id IS NULL;

-- Set user_id from the chat's user_id
UPDATE teams_messages tm
SET user_id = tc.user_id
FROM teams_chats tc
WHERE tm.chat_id = tc.id
AND tm.user_id IS NULL;

-- Make required columns NOT NULL after populating data
-- (Only run these if data is properly populated)
-- ALTER TABLE teams_messages ALTER COLUMN teams_account_id SET NOT NULL;
-- ALTER TABLE teams_messages ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE teams_messages ALTER COLUMN chat_id SET NOT NULL;
-- ALTER TABLE teams_messages ALTER COLUMN teams_message_id SET NOT NULL;
-- ALTER TABLE teams_messages ALTER COLUMN teams_chat_id SET NOT NULL;
-- ALTER TABLE teams_messages ALTER COLUMN sender_id SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_messages_chat ON teams_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_teams_messages_account ON teams_messages(teams_account_id);
CREATE INDEX IF NOT EXISTS idx_teams_messages_user ON teams_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_messages_teams_id ON teams_messages(teams_message_id);
CREATE INDEX IF NOT EXISTS idx_teams_messages_created ON teams_messages(teams_created_at);

-- Create unique constraint for upsert
CREATE UNIQUE INDEX IF NOT EXISTS teams_messages_unique ON teams_messages(chat_id, teams_message_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'teams_messages'
ORDER BY ordinal_position;
