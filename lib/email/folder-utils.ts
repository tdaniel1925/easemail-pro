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
 * @returns Sanitized folder name
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
  
  return sanitizeText(firstFolder);
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

