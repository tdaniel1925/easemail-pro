/**
 * Test Suite: CSV Parser
 * Tests RFC 4180 compliant CSV parsing with quoted commas
 */

import { describe, it, expect } from 'vitest';

describe('CSV Parser', () => {
  /**
   * Parse CSV with RFC 4180 compliance
   * Handles quoted values with commas, newlines, and quotes
   */
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote ("")
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator (not in quotes)
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Push last field
    result.push(current.trim());

    return result;
  };

  describe('Basic CSV Parsing', () => {
    it('should parse simple comma-separated values', () => {
      const result = parseCSVLine('John,Doe,john@example.com');
      expect(result).toEqual(['John', 'Doe', 'john@example.com']);
    });

    it('should parse values with spaces', () => {
      const result = parseCSVLine('John Doe, Jane Smith, admin@example.com');
      expect(result).toEqual(['John Doe', 'Jane Smith', 'admin@example.com']);
    });

    it('should handle empty fields', () => {
      const result = parseCSVLine('John,,john@example.com');
      expect(result).toEqual(['John', '', 'john@example.com']);
    });

    it('should handle trailing comma', () => {
      const result = parseCSVLine('John,Doe,');
      expect(result).toEqual(['John', 'Doe', '']);
    });
  });

  describe('Quoted Values', () => {
    it('should handle quoted value with comma', () => {
      const result = parseCSVLine('"Smith, Jones & Associates",john@example.com');
      expect(result).toEqual(['Smith, Jones & Associates', 'john@example.com']);
    });

    it('should handle multiple quoted values with commas', () => {
      const result = parseCSVLine('"Smith, Jones","Acme, Inc","test@example.com"');
      expect(result).toEqual(['Smith, Jones', 'Acme, Inc', 'test@example.com']);
    });

    it('should handle quoted value without comma', () => {
      const result = parseCSVLine('"John Doe",john@example.com');
      expect(result).toEqual(['John Doe', 'john@example.com']);
    });

    it('should handle empty quoted value', () => {
      const result = parseCSVLine('"",john@example.com');
      expect(result).toEqual(['', 'john@example.com']);
    });
  });

  describe('Escaped Quotes', () => {
    it('should handle escaped quote in quoted field', () => {
      const result = parseCSVLine('"Say ""Hello"""');
      expect(result).toEqual(['Say "Hello"']);
    });

    it('should handle multiple escaped quotes', () => {
      const result = parseCSVLine('"""Hello"" and ""Goodbye"""');
      expect(result).toEqual(['"Hello" and "Goodbye"']);
    });

    it('should handle quote at start', () => {
      const result = parseCSVLine('"""quoted"""');
      expect(result).toEqual(['"quoted"']);
    });

    it('should handle complex escaping', () => {
      const result = parseCSVLine('"He said, ""Hi!""",john@example.com');
      expect(result).toEqual(['He said, "Hi!"', 'john@example.com']);
    });
  });

  describe('Mixed Quoted and Unquoted', () => {
    it('should handle mix of quoted and unquoted fields', () => {
      const result = parseCSVLine('John,"Smith, Jones",john@example.com');
      expect(result).toEqual(['John', 'Smith, Jones', 'john@example.com']);
    });

    it('should handle complex real-world example', () => {
      const result = parseCSVLine('John Doe,"Smith, Jones & Associates, LLC","New York, NY",john@example.com');
      expect(result).toEqual([
        'John Doe',
        'Smith, Jones & Associates, LLC',
        'New York, NY',
        'john@example.com'
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single field', () => {
      const result = parseCSVLine('John');
      expect(result).toEqual(['John']);
    });

    it('should handle empty line', () => {
      const result = parseCSVLine('');
      expect(result).toEqual(['']);
    });

    it('should handle only commas', () => {
      const result = parseCSVLine(',,,');
      expect(result).toEqual(['', '', '', '']);
    });

    it('should handle quoted comma at end', () => {
      const result = parseCSVLine('John,"test,"');
      expect(result).toEqual(['John', 'test,']);
    });

    it('should handle quotes in middle of unquoted field (invalid CSV - quote toggles mode)', () => {
      // Note: This is invalid CSV, parser treats quote as start of quoted field
      const result = parseCSVLine('John"Doe,test');
      expect(result).toEqual(['JohnDoe,test']); // Quote starts quoted mode, absorbs comma
    });
  });

  describe('Real-World Contact Examples', () => {
    it('should parse contact with company name containing comma', () => {
      const result = parseCSVLine('John,Doe,"Smith, Jones & Co",CEO,john@example.com,555-1234');
      expect(result).toEqual([
        'John',
        'Doe',
        'Smith, Jones & Co',
        'CEO',
        'john@example.com',
        '555-1234'
      ]);
    });

    it('should parse contact with address containing commas', () => {
      const result = parseCSVLine('Jane,Smith,"123 Main St, Apt 4, New York, NY 10001",jane@example.com');
      expect(result).toEqual([
        'Jane',
        'Smith',
        '123 Main St, Apt 4, New York, NY 10001',
        'jane@example.com'
      ]);
    });

    it('should parse contact with notes containing quotes and commas', () => {
      const result = parseCSVLine('Bob,Johnson,bob@example.com,"Client said, ""Contact me tomorrow"""');
      expect(result).toEqual([
        'Bob',
        'Johnson',
        'bob@example.com',
        'Client said, "Contact me tomorrow"'
      ]);
    });
  });
});
