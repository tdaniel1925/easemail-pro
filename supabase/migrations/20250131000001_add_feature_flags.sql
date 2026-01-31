-- Add feature flag fields to user_preferences table
-- Migration: Add feature flags for experimental features

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS use_email_renderer_v3 BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN user_preferences.use_email_renderer_v3 IS 'Use V3 email renderer with iframe isolation';
