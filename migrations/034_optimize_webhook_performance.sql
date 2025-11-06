-- ============================================================================
-- WEBHOOK PERFORMANCE OPTIMIZATION
-- Fixes 16+ second webhook insert times
-- ============================================================================

-- 1. Add unique index on nylas_webhook_id for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_nylas_id
  ON webhook_events(nylas_webhook_id)
  WHERE nylas_webhook_id IS NOT NULL;

-- 2. Add index on processed status for background job queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed
  ON webhook_events(processed, created_at DESC)
  WHERE processed = false;

-- 3. Add index on event_type for monitoring queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_type
  ON webhook_events(event_type, created_at DESC);

-- 4. Add index on account_id for per-account queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_account
  ON webhook_events(account_id, created_at DESC)
  WHERE account_id IS NOT NULL;

-- 5. Add comment documenting the indexes
COMMENT ON INDEX idx_webhook_events_nylas_id IS 'Unique constraint for webhook deduplication - prevents duplicate processing';
COMMENT ON INDEX idx_webhook_events_processed IS 'Speeds up background job queries for unprocessed events';
COMMENT ON INDEX idx_webhook_events_type IS 'Speeds up monitoring queries by event type';
COMMENT ON INDEX idx_webhook_events_account IS 'Speeds up per-account webhook queries';

-- 6. Add cleanup for old processed webhooks (keep 30 days)
-- This prevents table bloat which slows down inserts
DO $$
BEGIN
  DELETE FROM webhook_events
  WHERE processed = true
    AND processed_at < NOW() - INTERVAL '30 days';

  RAISE NOTICE 'Cleaned up old webhook events';
END $$;
