-- ============================================================================
-- RE-NORMALIZE EMAIL FOLDERS AFTER WEBHOOK FIX
-- Migration 040 - Fixes emails affected by webhook bugs before fixes applied
-- ============================================================================
--
-- This migration re-normalizes email folders to fix any emails that got
-- incorrectly assigned folders due to the webhook handler bugs that were
-- just fixed in this update:
--
-- BUG #1: handleFolderUpdate was a stub (folders not created from webhooks)
-- BUG #2: handleMessageUpdated didn't normalize folders
-- BUG #3: Bulk move didn't normalize folders
--
-- Safe to run multiple times (idempotent)
--
-- ============================================================================

DO $$
DECLARE
  updated_count INTEGER;
  total_updated INTEGER := 0;
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RE-NORMALIZING EMAIL FOLDERS (POST-FIX)';
  RAISE NOTICE 'Migration 040 - Webhook Bug Cleanup';
  RAISE NOTICE '============================================';

  -- ============================================================================
  -- FIX MICROSOFT FOLDER IDs (Base64 encoded - most common webhook bug)
  -- ============================================================================
  -- Microsoft folder IDs look like: AQMkADcwODQ5NDQ2LTYwNzgtNDNiMS1hOTI4...
  -- These should never appear as folder names, they should be resolved to canonical names

  RAISE NOTICE 'Checking for Microsoft folder ID bugs...';

  -- Reset Microsoft folder IDs to inbox (they'll be fixed on next sync)
  UPDATE emails
  SET folder = 'inbox',
      updated_at = NOW()
  WHERE folder ~ '^[A-Za-z0-9=\-_]{50,}$' -- Regex for base64 strings 50+ chars
    AND folder != 'inbox';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  RAISE NOTICE '  Fixed % emails with Microsoft folder IDs → inbox', updated_count;

  -- ============================================================================
  -- RE-NORMALIZE COMMON PROVIDER FOLDER NAMES
  -- ============================================================================

  RAISE NOTICE 'Re-normalizing provider folder names...';

  -- Gmail Sent Mail variations
  UPDATE emails
  SET folder = 'sent',
      updated_at = NOW()
  WHERE folder != 'sent'
    AND (
      folder ILIKE '[Gmail]/Sent%'
      OR folder ILIKE '[Gmail]/Enviados%'
      OR folder ILIKE '[Gmail]/Gesendete%'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  RAISE NOTICE '  Fixed % Gmail sent emails', updated_count;

  -- Microsoft Sent Items variations
  UPDATE emails
  SET folder = 'sent',
      updated_at = NOW()
  WHERE folder != 'sent'
    AND (
      folder ILIKE 'Sent Items%'
      OR folder ILIKE 'Sent Mail%'
      OR folder ILIKE 'Sent Messages%'
      OR folder ILIKE 'Gesendete Elemente%'
      OR folder ILIKE 'Éléments envoyés%'
    )
    AND folder NOT ILIKE '[Gmail]%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  RAISE NOTICE '  Fixed % Microsoft sent emails', updated_count;

  -- Microsoft Deleted Items → trash
  UPDATE emails
  SET folder = 'trash',
      updated_at = NOW()
  WHERE folder != 'trash'
    AND (
      folder ILIKE 'Deleted Items%'
      OR folder ILIKE 'Gelöschte Elemente%'
      OR folder ILIKE 'Éléments supprimés%'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  RAISE NOTICE '  Fixed % Microsoft trash emails', updated_count;

  -- Microsoft Junk Email → spam
  UPDATE emails
  SET folder = 'spam',
      updated_at = NOW()
  WHERE folder != 'spam'
    AND (
      folder ILIKE 'Junk Email%'
      OR folder ILIKE 'Junk E-Mail%'
      OR folder ILIKE 'Junk-E-Mail%'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  RAISE NOTICE '  Fixed % Microsoft spam emails', updated_count;

  -- Gmail Trash
  UPDATE emails
  SET folder = 'trash',
      updated_at = NOW()
  WHERE folder != 'trash'
    AND folder ILIKE '[Gmail]/Trash%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  RAISE NOTICE '  Fixed % Gmail trash emails', updated_count;

  -- Gmail Spam
  UPDATE emails
  SET folder = 'spam',
      updated_at = NOW()
  WHERE folder != 'spam'
    AND folder ILIKE '[Gmail]/Spam%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  RAISE NOTICE '  Fixed % Gmail spam emails', updated_count;

  -- Gmail Drafts
  UPDATE emails
  SET folder = 'drafts',
      updated_at = NOW()
  WHERE folder != 'drafts'
    AND folder ILIKE '[Gmail]/Drafts%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  total_updated := total_updated + updated_count;
  RAISE NOTICE '  Fixed % Gmail draft emails', updated_count;

  -- ============================================================================
  -- FINAL STATISTICS
  -- ============================================================================

  RAISE NOTICE '============================================';
  RAISE NOTICE 'RE-NORMALIZATION COMPLETE!';
  RAISE NOTICE 'Total emails updated: %', total_updated;
  RAISE NOTICE '============================================';

  -- Show current folder distribution
  RAISE NOTICE '';
  RAISE NOTICE 'Current folder distribution:';

  FOR updated_count IN
    SELECT COUNT(*)::INTEGER FROM emails WHERE folder = 'inbox'
  LOOP
    RAISE NOTICE '  inbox:   % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*)::INTEGER FROM emails WHERE folder = 'sent'
  LOOP
    RAISE NOTICE '  sent:    % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*)::INTEGER FROM emails WHERE folder = 'drafts'
  LOOP
    RAISE NOTICE '  drafts:  % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*)::INTEGER FROM emails WHERE folder = 'trash'
  LOOP
    RAISE NOTICE '  trash:   % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*)::INTEGER FROM emails WHERE folder = 'spam'
  LOOP
    RAISE NOTICE '  spam:    % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*)::INTEGER FROM emails WHERE folder NOT IN ('inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'all')
  LOOP
    RAISE NOTICE '  custom:  % emails', updated_count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 040 complete!';
  RAISE NOTICE 'Webhook bugs are now fixed and existing data normalized.';
  RAISE NOTICE 'Future emails will sync correctly to the right folders.';

END $$;
