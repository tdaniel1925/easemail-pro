-- ✅ Silent Token Optimization
-- Add fields for proactive token management and graceful degradation
-- Run this migration: psql -U your_user -d your_db -f migrations/016_add_token_optimization_fields.sql

-- Add token_expires_at for precise expiry tracking (5 days ahead refresh)
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;

-- Add refresh_failures counter for graceful degradation (show error only after 5 failures)
ALTER TABLE email_accounts 
ADD COLUMN IF NOT EXISTS refresh_failures INTEGER DEFAULT 0;

-- Create index for faster token expiry checks
CREATE INDEX IF NOT EXISTS email_accounts_token_expires_at_idx ON email_accounts(token_expires_at);

-- Add helpful comment
COMMENT ON COLUMN email_accounts.token_expires_at IS 'Used for proactive token refresh (5 days before expiry)';
COMMENT ON COLUMN email_accounts.refresh_failures IS 'Graceful degradation counter - only show error after 5 consecutive failures';

