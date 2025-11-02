/**
 * Unit tests for text sanitizer
 * Ensures sanitization doesn't break falsy checks
 */

import { sanitizeText, sanitizeParticipants } from '../text-sanitizer';

describe('sanitizeText', () => {
  test('removes null bytes from text', () => {
    expect(sanitizeText('Hello\0World')).toBe('HelloWorld');
    expect(sanitizeText('Test\0\0Data')).toBe('TestData');
  });

  test('handles null and undefined correctly', () => {
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  test('returns empty string for empty input', () => {
    expect(sanitizeText('')).toBe('');
  });

  test('preserves valid strings', () => {
    expect(sanitizeText('Valid String')).toBe('Valid String');
    expect(sanitizeText('Sent Items')).toBe('Sent Items');
  });

  test('CRITICAL: empty string return can break || operators', () => {
    // This test documents the behavior that caused the bug
    const result = sanitizeText('') || 'default';
    expect(result).toBe('default');
    
    // This is the correct way to handle it
    const folder = '';
    const correctResult = folder ? sanitizeText(folder) : 'default';
    expect(correctResult).toBe('default');
  });
});

describe('sanitizeParticipants', () => {
  test('sanitizes participant emails and names', () => {
    const participants = [
      { email: 'test\0@example.com', name: 'John\0Doe' },
    ];
    const result = sanitizeParticipants(participants);
    expect(result[0].email).toBe('test@example.com');
    expect(result[0].name).toBe('JohnDoe');
  });

  test('handles undefined participants', () => {
    expect(sanitizeParticipants(undefined)).toEqual([]);
  });

  test('handles empty array', () => {
    expect(sanitizeParticipants([])).toEqual([]);
  });
});

