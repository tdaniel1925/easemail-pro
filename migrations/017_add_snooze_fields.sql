-- Add Snooze Fields to Emails Table
-- Allows users to temporarily hide emails until a specific time

-- Add snooze columns if they don't exist
DO $$ 
BEGIN
  -- Add is_snoozed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emails' AND column_name = 'is_snoozed'
  ) THEN
    ALTER TABLE emails ADD COLUMN is_snoozed BOOLEAN DEFAULT false;
  END IF;

  -- Add snooze_until column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'emails' AND column_name = 'snooze_until'
  ) THEN
    ALTER TABLE emails ADD COLUMN snooze_until TIMESTAMP;
  END IF;
END $$;

-- Create index for faster snooze queries
CREATE INDEX IF NOT EXISTS idx_emails_snoozed ON emails(is_snoozed, snooze_until) WHERE is_snoozed = true;

-- Create a function to automatically un-snooze emails when time arrives (optional)
-- This can be called by a cron job or background worker
CREATE OR REPLACE FUNCTION unsnooze_expired_emails()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE emails 
  SET 
    is_snoozed = false,
    folder = 'inbox'
  WHERE 
    is_snoozed = true 
    AND snooze_until IS NOT NULL 
    AND snooze_until <= NOW();
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Example of how to call this function periodically:
-- SELECT unsnooze_expired_emails();

