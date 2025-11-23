-- Add webhook suppression flag to email_accounts
-- This prevents webhooks from interfering with initial sync

ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS suppress_webhooks BOOLEAN DEFAULT FALSE;

-- Add index for webhook processing queries
CREATE INDEX IF NOT EXISTS idx_email_accounts_suppress_webhooks
ON email_accounts(suppress_webhooks)
WHERE suppress_webhooks = true;

COMMENT ON COLUMN email_accounts.suppress_webhooks IS 'Temporary flag to suppress webhook processing during initial sync to prevent race conditions';
