/**
 * Folder assignment utilities with built-in validation
 * Centralized logic to prevent folder sync bugs
 */

import { sanitizeText } from '../utils/text-sanitizer';

/**
 * SAFE folder assignment that prevents the sanitizeText || bug
 *
 * @param folders - Array of folder names from provider
 * @param defaultFolder - Default folder if none provided
 * @returns Normalized canonical folder name
 */
export function assignEmailFolder(
  folders: string[] | undefined | null,
  defaultFolder: string = 'inbox'
): string {
  // Check if folder exists BEFORE sanitizing
  const firstFolder = folders?.[0];

  if (!firstFolder || firstFolder.trim() === '') {
    return defaultFolder;
  }

  // ✅ Use comprehensive normalization for consistent folder names
  return normalizeFolderToCanonical(firstFolder);
}

/**
 * Validates that folder assignment is working correctly
 * Throws error if folder logic is broken
 */
export function validateFolderAssignment(
  input: string[] | undefined,
  output: string
): void {
  // If input had folders, output should NOT be default inbox
  if (input && input.length > 0 && input[0] && input[0].trim() !== '') {
    if (output === 'inbox' && !input[0].toLowerCase().includes('inbox')) {
      throw new Error(
        `FOLDER ASSIGNMENT BUG: Input folder "${input[0]}" was incorrectly assigned to "inbox"`
      );
    }
  }
}

/**
 * Normalizes folder name to canonical form
 * Helps identify same folders across different naming conventions
 */
export function normalizeFolderName(folderName: string): string {
  const normalized = folderName.toLowerCase().trim();

  // Map common variations to canonical names
  const folderMap: Record<string, string> = {
    'sent items': 'sent',
    'sent mail': 'sent',
    'gesendete elemente': 'sent',
    'deleted items': 'trash',
    'deleted messages': 'trash',
    'gelöschte elemente': 'trash',
    'junk email': 'spam',
    'junk': 'spam',
    'bulk mail': 'spam',
  };

  return folderMap[normalized] || normalized;
}

/**
 * COMPREHENSIVE folder normalization for Gmail, Microsoft, IMAP
 * Converts provider-specific folder names to canonical names (inbox, sent, drafts, trash, spam, etc.)
 *
 * This ensures emails sync to the correct folders regardless of provider naming conventions.
 * Used by: webhook handlers, sync endpoints, background jobs
 *
 * @param folderName - Raw folder name from email provider
 * @returns Canonical folder name (lowercase)
 *
 * @example
 * normalizeFolderToCanonical('[Gmail]/Sent Mail') // 'sent'
 * normalizeFolderToCanonical('Sent Items') // 'sent'
 * normalizeFolderToCanonical('INBOX.Sent') // 'sent'
 */
export function normalizeFolderToCanonical(folderName: string): string {
  if (!folderName || folderName.trim() === '') {
    return 'inbox'; // Default to inbox for empty folders
  }

  const normalized = folderName.toLowerCase().trim();

  // ============================================================================
  // GMAIL PATTERNS
  // ============================================================================
  const gmailPatterns: Record<string, string> = {
    // Gmail All Mail (special Gmail folder with all emails)
    '[gmail]/all mail': 'all',
    '[gmail]/toda a correspondência': 'all', // Portuguese
    '[gmail]/wszystkie': 'all', // Polish
    '[gmail]/tous les messages': 'all', // French
    '[gmail]/alle nachrichten': 'all', // German

    // Gmail Sent
    '[gmail]/sent mail': 'sent',
    '[gmail]/sent': 'sent',
    '[gmail]/enviados': 'sent', // Spanish/Portuguese
    '[gmail]/e-mails enviados': 'sent', // Portuguese
    '[gmail]/gesendete nachrichten': 'sent', // German
    '[gmail]/messages envoyés': 'sent', // French
    '[gmail]/wysłane': 'sent', // Polish
    '[gmail]/skickat': 'sent', // Swedish
    '[gmail]/verzonden': 'sent', // Dutch
    '[gmail]/inviati': 'sent', // Italian

    // Gmail Drafts
    '[gmail]/drafts': 'drafts',
    '[gmail]/rascunhos': 'drafts', // Portuguese
    '[gmail]/borradores': 'drafts', // Spanish
    '[gmail]/entwürfe': 'drafts', // German
    '[gmail]/brouillons': 'drafts', // French
    '[gmail]/wersje robocze': 'drafts', // Polish
    '[gmail]/concepten': 'drafts', // Dutch
    '[gmail]/bozze': 'drafts', // Italian

    // Gmail Trash
    '[gmail]/trash': 'trash',
    '[gmail]/bin': 'trash',
    '[gmail]/lixeira': 'trash', // Portuguese
    '[gmail]/papelera': 'trash', // Spanish
    '[gmail]/papierkorb': 'trash', // German
    '[gmail]/corbeille': 'trash', // French
    '[gmail]/kosz': 'trash', // Polish
    '[gmail]/prullenbak': 'trash', // Dutch
    '[gmail]/cestino': 'trash', // Italian

    // Gmail Spam
    '[gmail]/spam': 'spam',
    '[gmail]/lixo eletrônico': 'spam', // Portuguese
    '[gmail]/correo no deseado': 'spam', // Spanish
    '[gmail]/courrier indésirable': 'spam', // French
    '[gmail]/posta indesiderata': 'spam', // Italian

    // Gmail Important
    '[gmail]/important': 'important',
    '[gmail]/importante': 'important', // Spanish/Portuguese
    '[gmail]/wichtig': 'important', // German

    // Gmail Starred
    '[gmail]/starred': 'starred',
    '[gmail]/com estrela': 'starred', // Portuguese
    '[gmail]/destacados': 'starred', // Spanish
    '[gmail]/mit stern': 'starred', // German
    '[gmail]/suivis': 'starred', // French
  };

  if (gmailPatterns[normalized]) {
    return gmailPatterns[normalized];
  }

  // ============================================================================
  // MICROSOFT / OUTLOOK PATTERNS
  // ============================================================================
  const microsoftPatterns: Record<string, string> = {
    // Sent
    'sent items': 'sent',
    'sent mail': 'sent',
    'sent messages': 'sent',
    'gesendete elemente': 'sent', // German
    'éléments envoyés': 'sent', // French
    'elementi inviati': 'sent', // Italian
    'itens enviados': 'sent', // Portuguese
    'elementos enviados': 'sent', // Spanish
    'verzonden items': 'sent', // Dutch
    'wysłane': 'sent', // Polish

    // Drafts
    'drafts': 'drafts',
    'entwürfe': 'drafts', // German
    'brouillons': 'drafts', // French
    'bozze': 'drafts', // Italian
    'rascunhos': 'drafts', // Portuguese
    'borradores': 'drafts', // Spanish
    'concepten': 'drafts', // Dutch

    // Deleted/Trash
    'deleted items': 'trash',
    'deleted messages': 'trash',
    'trash': 'trash',
    'gelöschte elemente': 'trash', // German
    'éléments supprimés': 'trash', // French
    'elementi eliminati': 'trash', // Italian
    'itens excluídos': 'trash', // Portuguese
    'elementos eliminados': 'trash', // Spanish
    'verwijderde items': 'trash', // Dutch

    // Junk/Spam
    'junk email': 'spam',
    'junk e-mail': 'spam',
    'junk': 'spam',
    'spam': 'spam',
    'junk mail': 'spam',
    'bulk mail': 'spam',
    'junk-e-mail': 'spam', // German
    'courrier indésirable': 'spam', // French
    'posta indesiderata': 'spam', // Italian
    'email de lixo eletrônico': 'spam', // Portuguese
    'correo no deseado': 'spam', // Spanish

    // Archive
    'archive': 'archive',
    'archived': 'archive',
    'archiv': 'archive', // German
    'archivio': 'archive', // Italian
    'arquivo': 'archive', // Portuguese

    // Outbox
    'outbox': 'outbox',
    'postausgang': 'outbox', // German
    'boîte d\'envoi': 'outbox', // French
    'posta in uscita': 'outbox', // Italian
    'caixa de saída': 'outbox', // Portuguese

    // Conversation History (Microsoft Teams/Skype)
    'conversation history': 'conversation_history',
    'unterhaltungsverlauf': 'conversation_history', // German

    // Notes
    'notes': 'notes',
    'notizen': 'notes', // German
    'note': 'notes', // Italian
    'notas': 'notes', // Spanish/Portuguese
  };

  if (microsoftPatterns[normalized]) {
    return microsoftPatterns[normalized];
  }

  // ============================================================================
  // IMAP PATTERNS (Hierarchical folders with dots or slashes)
  // ============================================================================

  // Handle INBOX.* patterns (common in IMAP)
  if (normalized.startsWith('inbox.') || normalized.startsWith('inbox/')) {
    const folderPart = normalized.replace(/^inbox[./]/, '');

    const imapPatterns: Record<string, string> = {
      'sent': 'sent',
      'sent items': 'sent',
      'sent messages': 'sent',
      'drafts': 'drafts',
      'trash': 'trash',
      'deleted': 'trash',
      'deleted items': 'trash',
      'spam': 'spam',
      'junk': 'spam',
      'junk email': 'spam',
      'archive': 'archive',
      'archived': 'archive',
    };

    if (imapPatterns[folderPart]) {
      return imapPatterns[folderPart];
    }
  }

  // ============================================================================
  // GENERIC PATTERNS (language-agnostic detection)
  // ============================================================================

  // Detect "sent" in any position
  if (normalized.includes('sent') || normalized.includes('enviado') ||
      normalized.includes('gesendete') || normalized.includes('envoyé') ||
      normalized.includes('skickat') || normalized.includes('verzonden') ||
      normalized.includes('inviati') || normalized.includes('wysłane')) {
    return 'sent';
  }

  // Detect "draft" in any position
  if (normalized.includes('draft') || normalized.includes('rascunho') ||
      normalized.includes('borrador') || normalized.includes('entwurf') ||
      normalized.includes('brouillon') || normalized.includes('bozz') ||
      normalized.includes('concept')) {
    return 'drafts';
  }

  // Detect "trash/deleted" in any position
  if (normalized.includes('trash') || normalized.includes('deleted') ||
      normalized.includes('lixeira') || normalized.includes('papelera') ||
      normalized.includes('papierkorb') || normalized.includes('corbeille') ||
      normalized.includes('cestino') || normalized.includes('kosz') ||
      normalized.includes('gelöscht') || normalized.includes('supprimé')) {
    return 'trash';
  }

  // Detect "spam/junk" in any position
  if (normalized.includes('spam') || normalized.includes('junk') ||
      normalized.includes('bulk') || normalized.includes('lixo eletrônico') ||
      normalized.includes('no deseado') || normalized.includes('indésirable') ||
      normalized.includes('indesiderata')) {
    return 'spam';
  }

  // Detect "inbox"
  if (normalized === 'inbox' || normalized === 'posteingang' ||
      normalized === 'boîte de réception' || normalized === 'posta in arrivo' ||
      normalized === 'caixa de entrada' || normalized === 'bandeja de entrada' ||
      normalized === 'postvak in') {
    return 'inbox';
  }

  // Detect "archive"
  if (normalized.includes('archive') || normalized.includes('archiv') ||
      normalized.includes('archivio') || normalized.includes('arquivo')) {
    return 'archive';
  }

  // ============================================================================
  // FALLBACK: Return original folder name (custom folders)
  // ============================================================================
  return normalized;
}

