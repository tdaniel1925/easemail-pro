-- Fix Teams Schema Mismatch
-- Run this in Supabase SQL Editor to fix column names and add missing columns

-- =============================================
-- 1. Fix teams_chats table
-- =============================================

-- Rename account_id to teams_account_id
ALTER TABLE teams_chats
RENAME COLUMN account_id TO teams_account_id;

-- Add missing user_id column
ALTER TABLE teams_chats
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Populate user_id from teams_accounts (get user_id through the account relationship)
UPDATE teams_chats tc
SET user_id = ta.user_id
FROM teams_accounts ta
WHERE tc.teams_account_id = ta.id
AND tc.user_id IS NULL;

-- Make user_id NOT NULL after populating
ALTER TABLE teams_chats
ALTER COLUMN user_id SET NOT NULL;

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_teams_chats_user ON teams_chats(user_id);

-- Fix unique constraint (drop old one and create new one with correct column name)
DROP INDEX IF EXISTS teams_chats_account_chat_idx;
CREATE UNIQUE INDEX IF NOT EXISTS teams_chats_unique ON teams_chats(teams_account_id, teams_chat_id);

-- =============================================
-- 2. Fix teams_messages table
-- =============================================

-- Add missing teams_account_id column
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS teams_account_id UUID REFERENCES teams_accounts(id) ON DELETE CASCADE;

-- Populate teams_account_id from teams_chats
UPDATE teams_messages tm
SET teams_account_id = tc.teams_account_id
FROM teams_chats tc
WHERE tm.chat_id = tc.id
AND tm.teams_account_id IS NULL;

-- Add missing user_id column
ALTER TABLE teams_messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Populate user_id from teams_chats
UPDATE teams_messages tm
SET user_id = tc.user_id
FROM teams_chats tc
WHERE tm.chat_id = tc.id
AND tm.user_id IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_messages_account ON teams_messages(teams_account_id);
CREATE INDEX IF NOT EXISTS idx_teams_messages_user ON teams_messages(user_id);

-- =============================================
-- 3. Fix teams_sync_state table
-- =============================================

-- Rename account_id to teams_account_id
ALTER TABLE teams_sync_state
RENAME COLUMN account_id TO teams_account_id;

-- Add missing user_id column
ALTER TABLE teams_sync_state
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Populate user_id from teams_accounts
UPDATE teams_sync_state tss
SET user_id = ta.user_id
FROM teams_accounts ta
WHERE tss.teams_account_id = ta.id
AND tss.user_id IS NULL;

-- Rename resource_type to sync_type (to match schema)
ALTER TABLE teams_sync_state
RENAME COLUMN resource_type TO sync_type;

-- Add missing columns for sync state tracking
ALTER TABLE teams_sync_state
ADD COLUMN IF NOT EXISTS total_items INTEGER DEFAULT 0;

ALTER TABLE teams_sync_state
ADD COLUMN IF NOT EXISTS synced_items INTEGER DEFAULT 0;

ALTER TABLE teams_sync_state
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE teams_sync_state
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

ALTER TABLE teams_sync_state
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

ALTER TABLE teams_sync_state
ADD COLUMN IF NOT EXISTS last_error TEXT;

-- =============================================
-- 4. Fix teams_webhook_subscriptions table
-- =============================================

-- Rename account_id to teams_account_id
ALTER TABLE teams_webhook_subscriptions
RENAME COLUMN account_id TO teams_account_id;

-- Add missing user_id column
ALTER TABLE teams_webhook_subscriptions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Populate user_id from teams_accounts
UPDATE teams_webhook_subscriptions tws
SET user_id = ta.user_id
FROM teams_accounts ta
WHERE tws.teams_account_id = ta.id
AND tws.user_id IS NULL;

-- =============================================
-- Done!
-- =============================================
SELECT 'Teams schema fixed successfully!' as result;
