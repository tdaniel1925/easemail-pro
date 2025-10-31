-- Add AI attachment processing preference
-- This makes AI analysis OPT-IN (default OFF) for security

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS ai_attachment_processing BOOLEAN DEFAULT FALSE;

-- Add helpful comment
COMMENT ON COLUMN user_preferences.ai_attachment_processing IS 
'Enable AI-powered attachment classification and data extraction. Default OFF for security/privacy.';

