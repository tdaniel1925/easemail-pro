-- ================================================
-- IDEMPOTENT VERSION - Safe to run multiple times
-- ================================================

-- If migration already partially ran, clean up first
DROP TRIGGER IF EXISTS trigger_refresh_folder_counts ON emails;
DROP FUNCTION IF EXISTS queue_folder_counts_refresh() CASCADE;
DROP FUNCTION IF EXISTS refresh_folder_counts() CASCADE;
DROP FUNCTION IF EXISTS get_account_folder_counts(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_account_folder_counts(TEXT) CASCADE; -- Old version
DROP FUNCTION IF EXISTS get_folder_count(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_folder_count(TEXT, TEXT) CASCADE; -- Old version
DROP FUNCTION IF EXISTS force_refresh_folder_counts() CASCADE;
DROP INDEX IF EXISTS idx_folder_counts_account_folder;
DROP INDEX IF EXISTS idx_folder_counts_account;
DROP MATERIALIZED VIEW IF EXISTS folder_counts CASCADE;

-- Now run the full migration (copy all content from 021_materialized_folder_counts.sql)

