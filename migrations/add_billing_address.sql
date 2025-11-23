-- Migration: Add billing_address to users table
-- Date: 2025-01-22
-- Purpose: Enable tax calculation based on user's billing address

-- Add billing_address column (JSONB type for flexibility)
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- Add index for faster queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_users_billing_address ON users USING GIN (billing_address);

-- Add comment to document the column
COMMENT ON COLUMN users.billing_address IS 'User billing address for tax calculation. Structure: {street, street2, city, state, province, zipCode, country}';

-- Verify the migration
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
    AND column_name = 'billing_address'
  ) THEN
    RAISE NOTICE '✅ Migration successful: billing_address column added to users table';
  ELSE
    RAISE EXCEPTION '❌ Migration failed: billing_address column not found';
  END IF;
END $$;

-- Example billing address structure (for reference):
-- {
--   "street": "123 Main St",
--   "street2": "Apt 4B",
--   "city": "San Francisco",
--   "state": "CA",
--   "province": null,
--   "zipCode": "94102",
--   "country": "US"
-- }
