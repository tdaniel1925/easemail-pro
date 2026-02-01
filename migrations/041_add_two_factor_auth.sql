-- Add Two-Factor Authentication fields to users table
-- Migration: 041_add_two_factor_auth
-- Date: 2026-01-31

ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_codes TEXT[]; -- Array of encrypted recovery codes
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMP;

-- Create index for 2FA lookups
CREATE INDEX IF NOT EXISTS users_two_factor_enabled_idx ON users(two_factor_enabled) WHERE two_factor_enabled = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users.two_factor_secret IS 'Encrypted TOTP secret for authenticator apps';
COMMENT ON COLUMN users.recovery_codes IS 'Array of hashed recovery codes (10 codes)';
COMMENT ON COLUMN users.two_factor_enabled_at IS 'When 2FA was first enabled';
