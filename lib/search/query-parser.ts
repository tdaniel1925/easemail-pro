/**
 * Smart Query Parser
 * Parses search queries and extracts filters
 *
 * Supported filters:
 * - from:email@example.com
 * - to:email@example.com
 * - subject:"keyword"
 * - has:attachment
 * - is:unread, is:starred
 * - in:inbox, in:sent
 * - after:2024-01-01, before:2024-12-31
 * - filename:document.pdf
 */

export interface ParsedQuery {
  rawQuery: string;
  cleanQuery: string; // Query without filter syntax
  filters: {
    from?: string;
    to?: string;
    cc?: string;
    subject?: string;
    has?: string[]; // ['attachment', 'link']
    is?: string[]; // ['unread', 'starred', 'important']
    in?: string; // folder name
    after?: Date;
    before?: Date;
    filename?: string;
  };
  suggestions: string[]; // Autocomplete suggestions
}

/**
 * Parse a search query and extract filters
 */
export function parseSearchQuery(query: string): ParsedQuery {
  const filters: ParsedQuery['filters'] = {};
  let cleanQuery = query;

  // Extract from: filter
  const fromMatch = query.match(/from:([^\s]+)/i);
  if (fromMatch) {
    filters.from = fromMatch[1];
    cleanQuery = cleanQuery.replace(fromMatch[0], '').trim();
  }

  // Extract to: filter
  const toMatch = query.match(/to:([^\s]+)/i);
  if (toMatch) {
    filters.to = toMatch[1];
    cleanQuery = cleanQuery.replace(toMatch[0], '').trim();
  }

  // Extract cc: filter
  const ccMatch = query.match(/cc:([^\s]+)/i);
  if (ccMatch) {
    filters.cc = ccMatch[1];
    cleanQuery = cleanQuery.replace(ccMatch[0], '').trim();
  }

  // Extract subject: filter (handles quoted strings)
  const subjectMatch = query.match(/subject:["']([^"']+)["']|subject:([^\s]+)/i);
  if (subjectMatch) {
    filters.subject = subjectMatch[1] || subjectMatch[2];
    cleanQuery = cleanQuery.replace(subjectMatch[0], '').trim();
  }

  // Extract has: filters (can be multiple)
  const hasMatches = query.matchAll(/has:([^\s]+)/gi);
  const hasValues: string[] = [];
  for (const match of hasMatches) {
    hasValues.push(match[1].toLowerCase());
    cleanQuery = cleanQuery.replace(match[0], '').trim();
  }
  if (hasValues.length > 0) {
    filters.has = hasValues;
  }

  // Extract is: filters (can be multiple)
  const isMatches = query.matchAll(/is:([^\s]+)/gi);
  const isValues: string[] = [];
  for (const match of isMatches) {
    isValues.push(match[1].toLowerCase());
    cleanQuery = cleanQuery.replace(match[0], '').trim();
  }
  if (isValues.length > 0) {
    filters.is = isValues;
  }

  // Extract in: filter
  const inMatch = query.match(/in:([^\s]+)/i);
  if (inMatch) {
    filters.in = inMatch[1].toLowerCase();
    cleanQuery = cleanQuery.replace(inMatch[0], '').trim();
  }

  // Extract after: filter
  const afterMatch = query.match(/after:([^\s]+)/i);
  if (afterMatch) {
    const date = parseDateExpression(afterMatch[1]);
    if (date) {
      filters.after = date;
      cleanQuery = cleanQuery.replace(afterMatch[0], '').trim();
    }
  }

  // Extract before: filter
  const beforeMatch = query.match(/before:([^\s]+)/i);
  if (beforeMatch) {
    const date = parseDateExpression(beforeMatch[1]);
    if (date) {
      filters.before = date;
      cleanQuery = cleanQuery.replace(beforeMatch[0], '').trim();
    }
  }

  // Extract filename: filter
  const filenameMatch = query.match(/filename:["']([^"']+)["']|filename:([^\s]+)/i);
  if (filenameMatch) {
    filters.filename = filenameMatch[1] || filenameMatch[2];
    cleanQuery = cleanQuery.replace(filenameMatch[0], '').trim();
  }

  // Generate suggestions based on partial input
  const suggestions = generateSuggestions(query);

  return {
    rawQuery: query,
    cleanQuery: cleanQuery.trim(),
    filters,
    suggestions,
  };
}

/**
 * Parse date expressions
 * Supports: YYYY-MM-DD, today, yesterday, last-week, last-month, etc.
 */
function parseDateExpression(expr: string): Date | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (expr.toLowerCase()) {
    case 'today':
      return today;
    case 'yesterday':
      return new Date(today.getTime() - 24 * 60 * 60 * 1000);
    case 'last-week':
    case 'lastweek':
      return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'last-month':
    case 'lastmonth':
      return new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    default:
      // Try parsing as ISO date (YYYY-MM-DD)
      const date = new Date(expr);
      return isNaN(date.getTime()) ? null : date;
  }
}

/**
 * Generate autocomplete suggestions based on partial query
 */
function generateSuggestions(query: string): string[] {
  const suggestions: string[] = [];
  const lowerQuery = query.toLowerCase();

  // Common filter suggestions
  const commonFilters = [
    { prefix: 'from:', description: 'Filter by sender' },
    { prefix: 'to:', description: 'Filter by recipient' },
    { prefix: 'subject:', description: 'Filter by subject' },
    { prefix: 'has:attachment', description: 'Emails with attachments' },
    { prefix: 'has:link', description: 'Emails with links' },
    { prefix: 'is:unread', description: 'Unread emails' },
    { prefix: 'is:starred', description: 'Starred emails' },
    { prefix: 'is:important', description: 'Important emails' },
    { prefix: 'in:inbox', description: 'In inbox folder' },
    { prefix: 'in:sent', description: 'In sent folder' },
    { prefix: 'in:drafts', description: 'In drafts folder' },
    { prefix: 'after:today', description: 'After today' },
    { prefix: 'after:yesterday', description: 'After yesterday' },
    { prefix: 'after:last-week', description: 'After last week' },
    { prefix: 'before:today', description: 'Before today' },
    { prefix: 'filename:', description: 'Filter by filename' },
  ];

  // Find matching filters
  for (const filter of commonFilters) {
    if (filter.prefix.startsWith(lowerQuery) || lowerQuery.includes(filter.prefix.split(':')[0])) {
      suggestions.push(filter.prefix);
    }
  }

  return suggestions.slice(0, 5); // Limit to 5 suggestions
}

/**
 * Format parsed query for display (show active filters as chips)
 */
export function formatParsedQuery(parsed: ParsedQuery): string[] {
  const chips: string[] = [];

  if (parsed.filters.from) {
    chips.push(`From: ${parsed.filters.from}`);
  }
  if (parsed.filters.to) {
    chips.push(`To: ${parsed.filters.to}`);
  }
  if (parsed.filters.subject) {
    chips.push(`Subject: ${parsed.filters.subject}`);
  }
  if (parsed.filters.has) {
    parsed.filters.has.forEach(h => chips.push(`Has: ${h}`));
  }
  if (parsed.filters.is) {
    parsed.filters.is.forEach(i => chips.push(`Is: ${i}`));
  }
  if (parsed.filters.in) {
    chips.push(`In: ${parsed.filters.in}`);
  }
  if (parsed.filters.after) {
    chips.push(`After: ${parsed.filters.after.toLocaleDateString()}`);
  }
  if (parsed.filters.before) {
    chips.push(`Before: ${parsed.filters.before.toLocaleDateString()}`);
  }
  if (parsed.filters.filename) {
    chips.push(`Filename: ${parsed.filters.filename}`);
  }

  return chips;
}

/**
 * Build Nylas search query from parsed filters
 */
export function buildNylasQuery(parsed: ParsedQuery): string {
  let query = parsed.cleanQuery;

  // Nylas supports native Gmail/Outlook search syntax
  if (parsed.filters.from) {
    query += ` from:${parsed.filters.from}`;
  }
  if (parsed.filters.to) {
    query += ` to:${parsed.filters.to}`;
  }
  if (parsed.filters.subject) {
    query += ` subject:${parsed.filters.subject}`;
  }
  if (parsed.filters.has?.includes('attachment')) {
    query += ` has:attachment`;
  }
  if (parsed.filters.is?.includes('unread')) {
    query += ` is:unread`;
  }
  if (parsed.filters.is?.includes('starred')) {
    query += ` is:starred`;
  }
  if (parsed.filters.in) {
    query += ` in:${parsed.filters.in}`;
  }

  return query.trim();
}
