-- Add show_ai_summaries preference to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS show_ai_summaries BOOLEAN DEFAULT true;

COMMENT ON COLUMN user_preferences.show_ai_summaries IS 'Toggle between AI summaries and traditional subject/preview in email list';

