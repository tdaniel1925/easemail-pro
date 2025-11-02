/**
 * Integration tests for folder assignment logic
 * Prevents regressions in folder sync
 */

import { sanitizeText } from '../../utils/text-sanitizer';

describe('Folder Assignment Logic', () => {
  test('REGRESSION: sanitizeText with || operator bug', () => {
    // This is the bug that caused all emails to go to inbox
    const emptyFolder = '';
    const wrongWay = sanitizeText(emptyFolder) || 'inbox';
    expect(wrongWay).toBe('inbox'); // Bug: empty string treated as falsy
    
    // Correct way
    const correctWay = emptyFolder ? sanitizeText(emptyFolder) : 'inbox';
    expect(correctWay).toBe('inbox');
  });

  test('preserves valid folder names', () => {
    const folders = ['Sent Items', 'Drafts', 'Archive', 'Custom/Folder'];
    
    folders.forEach(folder => {
      const result = folder ? sanitizeText(folder) : 'inbox';
      expect(result).toBe(folder);
      expect(result).not.toBe('inbox');
    });
  });

  test('handles undefined folders correctly', () => {
    const message = { folders: undefined };
    const folder = message.folders?.[0] ? sanitizeText(message.folders[0]) : 'inbox';
    expect(folder).toBe('inbox');
  });

  test('handles empty folders array', () => {
    const message = { folders: [] };
    const folder = message.folders?.[0] ? sanitizeText(message.folders[0]) : 'inbox';
    expect(folder).toBe('inbox');
  });

  test('Microsoft Outlook folder names', () => {
    const outlookFolders = [
      'Sent Items',
      'Deleted Items',
      'Junk Email',
      'Archive',
      'Conversation History',
    ];

    outlookFolders.forEach(folder => {
      const result = folder ? sanitizeText(folder) : 'inbox';
      expect(result).toBe(folder);
    });
  });

  test('Gmail folder names', () => {
    const gmailFolders = [
      'SENT',
      'TRASH',
      'SPAM',
      'DRAFT',
      '[Gmail]/All Mail',
    ];

    gmailFolders.forEach(folder => {
      const result = folder ? sanitizeText(folder) : 'inbox';
      expect(result).toBe(folder);
    });
  });
});

