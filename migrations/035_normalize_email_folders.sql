-- ============================================================================
-- NORMALIZE EMAIL FOLDERS
-- Fixes misclassified emails by applying comprehensive folder normalization
-- Addresses issue: Sent emails not appearing in Sent folder
-- ============================================================================

-- This migration normalizes existing email folders to canonical names
-- (inbox, sent, drafts, trash, spam, etc.) to match Gmail, Microsoft, and IMAP conventions

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting folder normalization for existing emails...';

  -- ============================================================================
  -- GMAIL FOLDER NORMALIZATION
  -- ============================================================================

  -- Gmail Sent Mail
  UPDATE emails
  SET folder = 'sent'
  WHERE folder ILIKE '[Gmail]/Sent%'
     OR folder ILIKE '[Gmail]/Enviados%'
     OR folder ILIKE '[Gmail]/Gesendete%'
     OR folder ILIKE '[Gmail]/Messages envoyés%'
     OR folder ILIKE '[Gmail]/E-mails enviados%'
     OR folder ILIKE '[Gmail]/Wysłane%'
     OR folder ILIKE '[Gmail]/Skickat%'
     OR folder ILIKE '[Gmail]/Verzonden%'
     OR folder ILIKE '[Gmail]/Inviati%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Gmail sent emails', updated_count;

  -- Gmail Drafts
  UPDATE emails
  SET folder = 'drafts'
  WHERE folder ILIKE '[Gmail]/Drafts%'
     OR folder ILIKE '[Gmail]/Rascunhos%'
     OR folder ILIKE '[Gmail]/Borradores%'
     OR folder ILIKE '[Gmail]/Entwürfe%'
     OR folder ILIKE '[Gmail]/Brouillons%'
     OR folder ILIKE '[Gmail]/Wersje robocze%'
     OR folder ILIKE '[Gmail]/Concepten%'
     OR folder ILIKE '[Gmail]/Bozze%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Gmail draft emails', updated_count;

  -- Gmail Trash
  UPDATE emails
  SET folder = 'trash'
  WHERE folder ILIKE '[Gmail]/Trash%'
     OR folder ILIKE '[Gmail]/Bin%'
     OR folder ILIKE '[Gmail]/Lixeira%'
     OR folder ILIKE '[Gmail]/Papelera%'
     OR folder ILIKE '[Gmail]/Papierkorb%'
     OR folder ILIKE '[Gmail]/Corbeille%'
     OR folder ILIKE '[Gmail]/Kosz%'
     OR folder ILIKE '[Gmail]/Prullenbak%'
     OR folder ILIKE '[Gmail]/Cestino%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Gmail trash emails', updated_count;

  -- Gmail Spam
  UPDATE emails
  SET folder = 'spam'
  WHERE folder ILIKE '[Gmail]/Spam%'
     OR folder ILIKE '[Gmail]/Lixo eletrônico%'
     OR folder ILIKE '[Gmail]/Correo no deseado%'
     OR folder ILIKE '[Gmail]/Courrier indésirable%'
     OR folder ILIKE '[Gmail]/Posta indesiderata%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Gmail spam emails', updated_count;

  -- Gmail All Mail
  UPDATE emails
  SET folder = 'all'
  WHERE folder ILIKE '[Gmail]/All Mail%'
     OR folder ILIKE '[Gmail]/Toda a correspondência%'
     OR folder ILIKE '[Gmail]/Wszystkie%'
     OR folder ILIKE '[Gmail]/Tous les messages%'
     OR folder ILIKE '[Gmail]/Alle nachrichten%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Gmail all mail emails', updated_count;

  -- Gmail Important
  UPDATE emails
  SET folder = 'important'
  WHERE folder ILIKE '[Gmail]/Important%'
     OR folder ILIKE '[Gmail]/Importante%'
     OR folder ILIKE '[Gmail]/Wichtig%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Gmail important emails', updated_count;

  -- Gmail Starred
  UPDATE emails
  SET folder = 'starred'
  WHERE folder ILIKE '[Gmail]/Starred%'
     OR folder ILIKE '[Gmail]/Com estrela%'
     OR folder ILIKE '[Gmail]/Destacados%'
     OR folder ILIKE '[Gmail]/Mit stern%'
     OR folder ILIKE '[Gmail]/Suivis%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Gmail starred emails', updated_count;

  -- ============================================================================
  -- MICROSOFT / OUTLOOK FOLDER NORMALIZATION
  -- ============================================================================

  -- Microsoft Sent Items
  UPDATE emails
  SET folder = 'sent'
  WHERE (folder ILIKE 'Sent Items%'
     OR folder ILIKE 'Sent Mail%'
     OR folder ILIKE 'Sent Messages%'
     OR folder ILIKE 'Gesendete Elemente%'
     OR folder ILIKE 'Éléments envoyés%'
     OR folder ILIKE 'Elementi inviati%'
     OR folder ILIKE 'Itens enviados%'
     OR folder ILIKE 'Elementos enviados%'
     OR folder ILIKE 'Verzonden items%'
     OR folder ILIKE 'Wysłane%')
    AND folder NOT ILIKE '[Gmail]%'; -- Don't double-process Gmail

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Microsoft sent emails', updated_count;

  -- Microsoft Deleted Items
  UPDATE emails
  SET folder = 'trash'
  WHERE (folder ILIKE 'Deleted Items%'
     OR folder ILIKE 'Deleted Messages%'
     OR folder ILIKE 'Gelöschte Elemente%'
     OR folder ILIKE 'Éléments supprimés%'
     OR folder ILIKE 'Elementi eliminati%'
     OR folder ILIKE 'Itens excluídos%'
     OR folder ILIKE 'Elementos eliminados%'
     OR folder ILIKE 'Verwijderde items%')
    AND folder NOT ILIKE '[Gmail]%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Microsoft trash emails', updated_count;

  -- Microsoft Junk Email
  UPDATE emails
  SET folder = 'spam'
  WHERE (folder ILIKE 'Junk Email%'
     OR folder ILIKE 'Junk E-Mail%'
     OR folder ILIKE 'Junk%'
     OR folder ILIKE 'Junk-E-Mail%'
     OR folder ILIKE 'Courrier indésirable%'
     OR folder ILIKE 'Posta indesiderata%'
     OR folder ILIKE 'Email de lixo eletrônico%'
     OR folder ILIKE 'Correo no deseado%')
    AND folder NOT ILIKE '[Gmail]%'
    AND folder NOT ILIKE 'Bulk%'; -- Process bulk mail separately

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Microsoft spam emails', updated_count;

  -- Microsoft Archive
  UPDATE emails
  SET folder = 'archive'
  WHERE (folder ILIKE 'Archive%'
     OR folder ILIKE 'Archived%'
     OR folder ILIKE 'Archiv%'
     OR folder ILIKE 'Archivio%'
     OR folder ILIKE 'Arquivo%')
    AND folder NOT ILIKE '[Gmail]%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Microsoft archive emails', updated_count;

  -- Microsoft Outbox
  UPDATE emails
  SET folder = 'outbox'
  WHERE folder ILIKE 'Outbox%'
     OR folder ILIKE 'Postausgang%'
     OR folder ILIKE 'Boîte d''envoi%'
     OR folder ILIKE 'Posta in uscita%'
     OR folder ILIKE 'Caixa de saída%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Microsoft outbox emails', updated_count;

  -- Microsoft Conversation History
  UPDATE emails
  SET folder = 'conversation_history'
  WHERE folder ILIKE 'Conversation History%'
     OR folder ILIKE 'Unterhaltungsverlauf%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % Microsoft conversation history emails', updated_count;

  -- ============================================================================
  -- IMAP FOLDER NORMALIZATION (INBOX.* patterns)
  -- ============================================================================

  -- IMAP Sent
  UPDATE emails
  SET folder = 'sent'
  WHERE (folder ILIKE 'INBOX.Sent%'
     OR folder ILIKE 'INBOX/Sent%'
     OR folder ILIKE 'INBOX.Sent Items%'
     OR folder ILIKE 'INBOX/Sent Items%'
     OR folder ILIKE 'INBOX.Sent Messages%'
     OR folder ILIKE 'INBOX/Sent Messages%')
    AND folder NOT ILIKE '[Gmail]%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % IMAP sent emails', updated_count;

  -- IMAP Drafts
  UPDATE emails
  SET folder = 'drafts'
  WHERE (folder ILIKE 'INBOX.Drafts%'
     OR folder ILIKE 'INBOX/Drafts%')
    AND folder NOT ILIKE '[Gmail]%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % IMAP draft emails', updated_count;

  -- IMAP Trash
  UPDATE emails
  SET folder = 'trash'
  WHERE (folder ILIKE 'INBOX.Trash%'
     OR folder ILIKE 'INBOX/Trash%'
     OR folder ILIKE 'INBOX.Deleted%'
     OR folder ILIKE 'INBOX/Deleted%'
     OR folder ILIKE 'INBOX.Deleted Items%'
     OR folder ILIKE 'INBOX/Deleted Items%')
    AND folder NOT ILIKE '[Gmail]%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % IMAP trash emails', updated_count;

  -- IMAP Spam
  UPDATE emails
  SET folder = 'spam'
  WHERE (folder ILIKE 'INBOX.Spam%'
     OR folder ILIKE 'INBOX/Spam%'
     OR folder ILIKE 'INBOX.Junk%'
     OR folder ILIKE 'INBOX/Junk%'
     OR folder ILIKE 'INBOX.Junk Email%'
     OR folder ILIKE 'INBOX/Junk Email%')
    AND folder NOT ILIKE '[Gmail]%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % IMAP spam emails', updated_count;

  -- IMAP Archive
  UPDATE emails
  SET folder = 'archive'
  WHERE (folder ILIKE 'INBOX.Archive%'
     OR folder ILIKE 'INBOX/Archive%'
     OR folder ILIKE 'INBOX.Archived%'
     OR folder ILIKE 'INBOX/Archived%')
    AND folder NOT ILIKE '[Gmail]%';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % IMAP archive emails', updated_count;

  -- ============================================================================
  -- GENERIC PATTERN MATCHING (fallback for unmapped folders)
  -- ============================================================================

  -- Generic "sent" pattern (language-agnostic)
  UPDATE emails
  SET folder = 'sent'
  WHERE folder != 'sent' -- Don't update already normalized
    AND folder NOT ILIKE '[Gmail]%' -- Don't reprocess Gmail
    AND folder NOT ILIKE 'INBOX.%' -- Don't reprocess IMAP
    AND (
      LOWER(folder) LIKE '%sent%'
      OR LOWER(folder) LIKE '%enviado%'
      OR LOWER(folder) LIKE '%gesendete%'
      OR LOWER(folder) LIKE '%envoyé%'
      OR LOWER(folder) LIKE '%skickat%'
      OR LOWER(folder) LIKE '%verzonden%'
      OR LOWER(folder) LIKE '%inviati%'
      OR LOWER(folder) LIKE '%wysłane%'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % generic sent emails', updated_count;

  -- Generic "draft" pattern
  UPDATE emails
  SET folder = 'drafts'
  WHERE folder != 'drafts'
    AND folder NOT ILIKE '[Gmail]%'
    AND folder NOT ILIKE 'INBOX.%'
    AND (
      LOWER(folder) LIKE '%draft%'
      OR LOWER(folder) LIKE '%rascunho%'
      OR LOWER(folder) LIKE '%borrador%'
      OR LOWER(folder) LIKE '%entwurf%'
      OR LOWER(folder) LIKE '%brouillon%'
      OR LOWER(folder) LIKE '%bozz%'
      OR LOWER(folder) LIKE '%concept%'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % generic draft emails', updated_count;

  -- Generic "trash/deleted" pattern
  UPDATE emails
  SET folder = 'trash'
  WHERE folder != 'trash'
    AND folder NOT ILIKE '[Gmail]%'
    AND folder NOT ILIKE 'INBOX.%'
    AND (
      LOWER(folder) LIKE '%trash%'
      OR LOWER(folder) LIKE '%deleted%'
      OR LOWER(folder) LIKE '%lixeira%'
      OR LOWER(folder) LIKE '%papelera%'
      OR LOWER(folder) LIKE '%papierkorb%'
      OR LOWER(folder) LIKE '%corbeille%'
      OR LOWER(folder) LIKE '%cestino%'
      OR LOWER(folder) LIKE '%kosz%'
      OR LOWER(folder) LIKE '%gelöscht%'
      OR LOWER(folder) LIKE '%supprimé%'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % generic trash emails', updated_count;

  -- Generic "spam/junk" pattern
  UPDATE emails
  SET folder = 'spam'
  WHERE folder != 'spam'
    AND folder NOT ILIKE '[Gmail]%'
    AND folder NOT ILIKE 'INBOX.%'
    AND (
      LOWER(folder) LIKE '%spam%'
      OR LOWER(folder) LIKE '%junk%'
      OR LOWER(folder) LIKE '%bulk%'
      OR LOWER(folder) LIKE '%lixo eletrônico%'
      OR LOWER(folder) LIKE '%no deseado%'
      OR LOWER(folder) LIKE '%indésirable%'
      OR LOWER(folder) LIKE '%indesiderata%'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % generic spam emails', updated_count;

  -- Generic "archive" pattern
  UPDATE emails
  SET folder = 'archive'
  WHERE folder != 'archive'
    AND folder NOT ILIKE '[Gmail]%'
    AND folder NOT ILIKE 'INBOX.%'
    AND (
      LOWER(folder) LIKE '%archive%'
      OR LOWER(folder) LIKE '%archiv%'
      OR LOWER(folder) LIKE '%archivio%'
      OR LOWER(folder) LIKE '%arquivo%'
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % generic archive emails', updated_count;

  -- ============================================================================
  -- FINAL STATISTICS
  -- ============================================================================

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Folder normalization complete!';
  RAISE NOTICE '==========================================';

  -- Show folder distribution after migration
  RAISE NOTICE 'Current folder distribution:';
  FOR updated_count IN
    SELECT COUNT(*) FROM emails WHERE folder = 'sent'
  LOOP
    RAISE NOTICE 'sent: % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*) FROM emails WHERE folder = 'inbox'
  LOOP
    RAISE NOTICE 'inbox: % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*) FROM emails WHERE folder = 'drafts'
  LOOP
    RAISE NOTICE 'drafts: % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*) FROM emails WHERE folder = 'trash'
  LOOP
    RAISE NOTICE 'trash: % emails', updated_count;
  END LOOP;

  FOR updated_count IN
    SELECT COUNT(*) FROM emails WHERE folder = 'spam'
  LOOP
    RAISE NOTICE 'spam: % emails', updated_count;
  END LOOP;

END $$;

-- Add index on folder for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);

-- Add comment documenting the normalization
COMMENT ON COLUMN emails.folder IS 'Canonical folder name (inbox, sent, drafts, trash, spam, etc.) - normalized from provider-specific names';
