-- Migration 036: Make contact email nullable to support phone-only contacts
-- Date: 2025-01-13

-- Remove NOT NULL constraint from contacts.email
ALTER TABLE contacts
ALTER COLUMN email DROP NOT NULL;

-- Add a check constraint to ensure at least one contact method exists
ALTER TABLE contacts
ADD CONSTRAINT contact_has_email_or_phone
CHECK (email IS NOT NULL OR phone IS NOT NULL);

-- Create index on phone for lookups
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;

-- Update existing contacts with NULL email to ensure they have phone
-- (This should not be needed if data is clean, but good practice)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM contacts
    WHERE email IS NULL AND phone IS NULL
  ) THEN
    RAISE EXCEPTION 'Found contacts with both NULL email and phone. Please clean data first.';
  END IF;
END $$;
