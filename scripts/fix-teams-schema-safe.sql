-- Safe Teams Schema Fix
-- Checks column existence before making changes

-- First, let's check what columns exist
SELECT
    table_name,
    column_name
FROM information_schema.columns
WHERE table_name IN ('teams_chats', 'teams_messages', 'teams_sync_state', 'teams_webhook_subscriptions')
ORDER BY table_name, ordinal_position;
