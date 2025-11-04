-- Migration: Add hide_signature_prompt to user_preferences
-- Description: Adds a flag to track users who don't want to see the signature creation prompt

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS hide_signature_prompt BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_hide_signature_prompt 
ON user_preferences(hide_signature_prompt) 
WHERE hide_signature_prompt = false;

