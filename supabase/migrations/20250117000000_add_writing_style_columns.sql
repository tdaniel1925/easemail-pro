-- Add writing style columns to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS email_writing_style TEXT,
ADD COLUMN IF NOT EXISTS email_style_learned_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS use_personal_style BOOLEAN DEFAULT TRUE;

-- Add comment
COMMENT ON COLUMN user_preferences.email_writing_style IS 'AI-generated writing style profile based on user''s sent emails';
COMMENT ON COLUMN user_preferences.email_style_learned_at IS 'Timestamp when writing style was last learned/updated';
COMMENT ON COLUMN user_preferences.use_personal_style IS 'Toggle for using learned personal style vs generic professional style';
