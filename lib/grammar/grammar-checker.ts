/**
 * Grammar and spell checking utilities
 * Uses basic grammar rules for real-time checking
 */

export interface GrammarIssue {
  type: 'spelling' | 'grammar' | 'style';
  message: string;
  suggestions: string[];
  startIndex: number;
  endIndex: number;
  severity: 'error' | 'warning' | 'info';
}

// Common grammar patterns to check
const GRAMMAR_PATTERNS = [
  {
    pattern: /\b(their|there|they're)\b/gi,
    check: (match: string, context: string) => {
      const beforeWord = context.substring(Math.max(0, context.indexOf(match) - 20), context.indexOf(match));
      const afterWord = context.substring(context.indexOf(match) + match.length, context.indexOf(match) + match.length + 20);

      // Basic context-based suggestions
      if (match.toLowerCase() === 'there' && /\b(is|are|was|were)\b/i.test(afterWord)) {
        return null; // "there is/are" is correct
      }
      return null; // Would need more context for accurate checking
    }
  },
  {
    pattern: /\b(your|you're)\b/gi,
    check: (match: string, context: string) => {
      return null; // Would need NLP for accurate checking
    }
  },
  {
    pattern: /\b(its|it's)\b/gi,
    check: (match: string, context: string) => {
      const afterWord = context.substring(context.indexOf(match) + match.length, context.indexOf(match) + match.length + 10);
      if (match.toLowerCase() === 'its' && /^['']?\s+(is|was|been|has)/i.test(afterWord)) {
        return {
          message: "Did you mean \"it's\" (it is)?",
          suggestions: ["it's"],
          severity: 'warning' as const
        };
      }
      return null;
    }
  },
  {
    pattern: /\b(affect|effect)\b/gi,
    check: (match: string, context: string) => {
      return null; // Complex, would need full sentence analysis
    }
  }
];

// Common style suggestions
const STYLE_PATTERNS = [
  {
    pattern: /\b(very|really|actually|basically|literally)\b/gi,
    message: "Consider removing this filler word for stronger writing",
    severity: 'info' as const
  },
  {
    pattern: /([.!?])\s+[a-z]/g, // Sentence doesn't start with capital
    message: "Sentence should start with a capital letter",
    severity: 'warning' as const
  },
  {
    pattern: /\s{2,}/g, // Multiple spaces
    message: "Multiple spaces detected",
    severity: 'info' as const
  },
  {
    pattern: /[.!?]{2,}/g, // Multiple punctuation
    message: "Multiple punctuation marks",
    severity: 'info' as const
  }
];

// Passive voice detection (simplified)
const PASSIVE_VOICE_PATTERN = /\b(am|is|are|was|were|be|been|being)\s+(being\s+)?(\w+ed|gotten|broken|spoken|written)\b/gi;

/**
 * Check text for grammar and style issues
 */
export function checkGrammar(text: string): GrammarIssue[] {
  const issues: GrammarIssue[] = [];

  if (!text || text.trim().length === 0) {
    return issues;
  }

  // Check grammar patterns
  GRAMMAR_PATTERNS.forEach(({ pattern, check }) => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      const result = check(match[0], text);
      if (result) {
        issues.push({
          type: 'grammar',
          message: result.message,
          suggestions: result.suggestions,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          severity: result.severity
        });
      }
    }
  });

  // Check style patterns
  STYLE_PATTERNS.forEach(({ pattern, message, severity }) => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        type: 'style',
        message,
        suggestions: [],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        severity
      });
    }
  });

  // Check for passive voice
  let passiveMatch;
  const passiveRegex = new RegExp(PASSIVE_VOICE_PATTERN);
  while ((passiveMatch = passiveRegex.exec(text)) !== null) {
    issues.push({
      type: 'style',
      message: 'Consider using active voice for clearer writing',
      suggestions: [],
      startIndex: passiveMatch.index,
      endIndex: passiveMatch.index + passiveMatch[0].length,
      severity: 'info'
    });
  }

  return issues;
}

/**
 * Get color for issue severity
 */
export function getIssueSeverityColor(severity: 'error' | 'warning' | 'info'): string {
  switch (severity) {
    case 'error':
      return 'rgba(239, 68, 68, 0.3)'; // red
    case 'warning':
      return 'rgba(251, 191, 36, 0.3)'; // yellow
    case 'info':
      return 'rgba(59, 130, 246, 0.3)'; // blue
  }
}
