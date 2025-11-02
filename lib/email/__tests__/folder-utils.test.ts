/**
 * Tests for folder utility functions
 */

import { assignEmailFolder, validateFolderAssignment, normalizeFolderName } from '../folder-utils';

describe('assignEmailFolder', () => {
  test('safely assigns folder when present', () => {
    expect(assignEmailFolder(['Sent Items'])).toBe('Sent Items');
    expect(assignEmailFolder(['Archive'])).toBe('Archive');
    expect(assignEmailFolder(['Custom Folder'])).toBe('Custom Folder');
  });

  test('returns default when folders undefined', () => {
    expect(assignEmailFolder(undefined)).toBe('inbox');
    expect(assignEmailFolder(null)).toBe('inbox');
    expect(assignEmailFolder([])).toBe('inbox');
  });

  test('returns default when folder is empty string', () => {
    expect(assignEmailFolder([''])).toBe('inbox');
    expect(assignEmailFolder(['   '])).toBe('inbox');
  });

  test('supports custom default folder', () => {
    expect(assignEmailFolder(undefined, 'archive')).toBe('archive');
    expect(assignEmailFolder([], 'spam')).toBe('spam');
  });

  test('removes null bytes from folder names', () => {
    expect(assignEmailFolder(['Sent\0Items'])).toBe('SentItems');
  });

  test('REGRESSION: never returns empty string', () => {
    // The bug that broke folder sync
    const result = assignEmailFolder(['']);
    expect(result).not.toBe('');
    expect(result).toBe('inbox');
  });
});

describe('validateFolderAssignment', () => {
  test('passes when folder assignment is correct', () => {
    expect(() => {
      validateFolderAssignment(['Sent Items'], 'Sent Items');
    }).not.toThrow();
  });

  test('throws when folder incorrectly assigned to inbox', () => {
    expect(() => {
      validateFolderAssignment(['Sent Items'], 'inbox');
    }).toThrow('FOLDER ASSIGNMENT BUG');
  });

  test('allows inbox when input is inbox', () => {
    expect(() => {
      validateFolderAssignment(['Inbox'], 'inbox');
    }).not.toThrow();
  });

  test('allows inbox when no folders provided', () => {
    expect(() => {
      validateFolderAssignment(undefined, 'inbox');
    }).not.toThrow();
  });
});

describe('normalizeFolderName', () => {
  test('normalizes Microsoft Outlook folder names', () => {
    expect(normalizeFolderName('Sent Items')).toBe('sent');
    expect(normalizeFolderName('Deleted Items')).toBe('trash');
    expect(normalizeFolderName('Junk Email')).toBe('spam');
  });

  test('normalizes German folder names', () => {
    expect(normalizeFolderName('Gesendete Elemente')).toBe('sent');
    expect(normalizeFolderName('Gelöschte Elemente')).toBe('trash');
  });

  test('preserves custom folder names', () => {
    expect(normalizeFolderName('My Custom Folder')).toBe('my custom folder');
    expect(normalizeFolderName('Projects/2024')).toBe('projects/2024');
  });
});

