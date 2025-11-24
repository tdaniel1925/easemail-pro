/**
 * Contact Import Parser
 * Supports CSV, vCard, and Excel file parsing
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedContact {
  [key: string]: string | string[] | undefined;
}

export interface ParseResult {
  contacts: ParsedContact[];
  headers: string[];
  fileType: 'csv' | 'vcard' | 'excel';
  totalCount: number;
}

/**
 * Parse CSV file
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const contacts = results.data as ParsedContact[];
        const headers = results.meta.fields || [];

        resolve({
          contacts,
          headers,
          fileType: 'csv',
          totalCount: contacts.length,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Parse vCard file (.vcf)
 */
export async function parseVCard(file: File): Promise<ParseResult> {
  const text = await file.text();
  const contacts: ParsedContact[] = [];

  // Split by BEGIN:VCARD to handle multiple contacts
  const vCards = text.split('BEGIN:VCARD').filter(card => card.trim());

  for (const vCardText of vCards) {
    const contact: ParsedContact = {};
    const lines = vCardText.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('VERSION') || trimmedLine.startsWith('END:VCARD')) {
        continue;
      }

      // Parse vCard line (e.g., "FN:John Doe" or "EMAIL;TYPE=WORK:john@example.com")
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;

      const propertyPart = trimmedLine.substring(0, colonIndex);
      const value = trimmedLine.substring(colonIndex + 1).trim();

      // Split property and parameters (e.g., "EMAIL;TYPE=WORK" -> "EMAIL")
      const [property] = propertyPart.split(';');

      // Map vCard properties to common field names
      switch (property) {
        case 'FN':
          contact.fullName = value;
          break;
        case 'N':
          // N:Surname;Given;Middle;Prefix;Suffix
          const nameParts = value.split(';');
          contact.surname = nameParts[0] || '';
          contact.givenName = nameParts[1] || '';
          contact.middleName = nameParts[2] || '';
          break;
        case 'EMAIL':
          if (!contact.emails) contact.emails = [];
          (contact.emails as string[]).push(value);
          break;
        case 'TEL':
          if (!contact.phones) contact.phones = [];
          (contact.phones as string[]).push(value);
          break;
        case 'ORG':
          contact.company = value;
          break;
        case 'TITLE':
          contact.jobTitle = value;
          break;
        case 'ADR':
          // ADR:;;Street;City;State;PostalCode;Country
          const addrParts = value.split(';');
          contact.street = addrParts[2] || '';
          contact.city = addrParts[3] || '';
          contact.state = addrParts[4] || '';
          contact.postalCode = addrParts[5] || '';
          contact.country = addrParts[6] || '';
          break;
        case 'NOTE':
          contact.notes = value;
          break;
        case 'BDAY':
          contact.birthday = value;
          break;
        default:
          // Store other properties as-is
          contact[property.toLowerCase()] = value;
      }
    }

    if (Object.keys(contact).length > 0) {
      contacts.push(contact);
    }
  }

  // Determine available headers from all contacts
  const headersSet = new Set<string>();
  contacts.forEach(contact => {
    Object.keys(contact).forEach(key => headersSet.add(key));
  });

  const headers = Array.from(headersSet);

  return {
    contacts,
    headers,
    fileType: 'vcard',
    totalCount: contacts.length,
  };
}

/**
 * Parse Excel file (.xlsx, .xls)
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('Failed to read file');
        }

        const workbook = XLSX.read(data, { type: 'binary' });

        // Use first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as string[][];

        if (jsonData.length === 0) {
          throw new Error('Excel file is empty');
        }

        // First row is headers
        const headers = jsonData[0].map(h => String(h));
        const dataRows = jsonData.slice(1);

        // Convert rows to objects
        const contacts: ParsedContact[] = dataRows.map(row => {
          const contact: ParsedContact = {};
          headers.forEach((header, index) => {
            if (row[index] !== undefined && row[index] !== '') {
              contact[header] = String(row[index]);
            }
          });
          return contact;
        }).filter(contact => Object.keys(contact).length > 0);

        resolve({
          contacts,
          headers,
          fileType: 'excel',
          totalCount: contacts.length,
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to parse Excel file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsBinaryString(file);
  });
}

/**
 * Main parser function that detects file type and parses accordingly
 */
export async function parseContactFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'csv':
      return parseCSV(file);
    case 'vcf':
    case 'vcard':
      return parseVCard(file);
    case 'xlsx':
    case 'xls':
      return parseExcel(file);
    default:
      throw new Error(`Unsupported file type: ${extension}. Please use CSV, vCard (.vcf), or Excel (.xlsx, .xls) files.`);
  }
}

/**
 * Get suggested field mapping based on header names
 */
export function getSuggestedMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const headerLower = headers.map(h => h.toLowerCase());

  // Common mappings
  const patterns: Record<string, string[]> = {
    givenName: ['first name', 'given name', 'firstname', 'givenname', 'first', 'fname'],
    surname: ['last name', 'surname', 'lastname', 'family name', 'last', 'lname'],
    email: ['email', 'e-mail', 'email address', 'emailaddress'],
    phoneNumber: ['phone', 'telephone', 'mobile', 'cell', 'phone number', 'tel'],
    companyName: ['company', 'organization', 'org', 'company name'],
    jobTitle: ['title', 'job title', 'position', 'role'],
    street: ['address', 'street', 'street address', 'addr'],
    city: ['city', 'town'],
    state: ['state', 'province', 'region'],
    postalCode: ['zip', 'postal code', 'zipcode', 'postcode', 'zip code'],
    country: ['country'],
    notes: ['notes', 'note', 'comments', 'comment'],
    birthday: ['birthday', 'birth date', 'dob', 'date of birth'],
  };

  headerLower.forEach((headerLC, index) => {
    const originalHeader = headers[index];

    // Check each pattern
    for (const [targetField, patterns] of Object.entries(patterns)) {
      if (patterns.some(pattern => headerLC.includes(pattern))) {
        mapping[originalHeader] = targetField;
        break;
      }
    }

    // If no match found, try exact match
    if (!mapping[originalHeader] && headerLC in patterns) {
      mapping[originalHeader] = headerLC;
    }
  });

  return mapping;
}
