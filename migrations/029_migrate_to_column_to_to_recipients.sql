-- Migration: Migrate old column names to new naming convention in email_drafts
-- Purpose: Handle migration from 'to_emails' to 'to_recipients' and from reserved keyword 'to' to 'to_recipients'
-- Date: 2025-11-04
-- Note: This assumes migration 028 has already run and added the to_recipients column

-- Step 1: Copy data from "to" column to to_recipients (if "to" column exists from migration 028)
DO $$
BEGIN
  -- Check if the old "to" column exists (from migration 028)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_drafts'
    AND column_name = 'to'
  ) THEN
    -- Copy data from "to" to to_recipients where to_recipients is empty
    UPDATE email_drafts
    SET to_recipients = "to"
    WHERE to_recipients = '[]'::jsonb
      AND "to" IS NOT NULL
      AND "to" != '[]'::jsonb;

    RAISE NOTICE 'Migrated data from "to" column to to_recipients';

    -- Drop the old "to" column
    ALTER TABLE email_drafts DROP COLUMN IF EXISTS "to";

    RAISE NOTICE 'Dropped old "to" column';
  END IF;
END $$;

-- Step 2: Copy data from "to_emails" column to to_recipients (if using base schema)
DO $$
BEGIN
  -- Check if to_emails column exists (from base schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_drafts'
    AND column_name = 'to_emails'
  ) THEN
    -- If to_recipients doesn't exist yet, create it
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'email_drafts'
      AND column_name = 'to_recipients'
    ) THEN
      ALTER TABLE email_drafts
      ADD COLUMN to_recipients JSONB NOT NULL DEFAULT '[]'::jsonb;

      RAISE NOTICE 'Created to_recipients column';
    END IF;

    -- Copy data from to_emails to to_recipients
    UPDATE email_drafts
    SET to_recipients = to_emails
    WHERE to_recipients = '[]'::jsonb
      AND to_emails IS NOT NULL
      AND to_emails != '[]'::jsonb;

    RAISE NOTICE 'Migrated data from to_emails column to to_recipients';

    -- Drop the old to_emails column
    ALTER TABLE email_drafts DROP COLUMN IF EXISTS to_emails;

    RAISE NOTICE 'Dropped old to_emails column';
  END IF;
END $$;

-- Step 3: Ensure to_recipients has the correct constraint and default
ALTER TABLE email_drafts
  ALTER COLUMN to_recipients SET NOT NULL,
  ALTER COLUMN to_recipients SET DEFAULT '[]'::jsonb;

-- Step 4: Add index for better query performance on recipients
CREATE INDEX IF NOT EXISTS idx_email_drafts_to_recipients ON email_drafts USING gin(to_recipients);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complete: to_recipients is now the primary recipient column';
END $$;
