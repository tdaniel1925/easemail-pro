-- Add notification preference fields to user_preferences table
-- Migration: Add quietHours and showPreview notification settings

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS show_notification_preview BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quiet_hours_start VARCHAR(5) DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end VARCHAR(5) DEFAULT '08:00';

COMMENT ON COLUMN user_preferences.show_notification_preview IS 'Whether to show email content preview in notifications';
COMMENT ON COLUMN user_preferences.quiet_hours_enabled IS 'Whether quiet hours are enabled for notifications';
COMMENT ON COLUMN user_preferences.quiet_hours_start IS 'Start time for quiet hours in HH:MM format';
COMMENT ON COLUMN user_preferences.quiet_hours_end IS 'End time for quiet hours in HH:MM format';
