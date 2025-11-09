/**
 * Simplified Rule Templates ("Outlook-Lite")
 *
 * 5 common templates users can customize and use
 */

import type { SimpleRuleTemplate } from './types-simple';

export const SIMPLE_RULE_TEMPLATES: SimpleRuleTemplate[] = [
  {
    id: 'newsletter-organizer',
    name: 'Move newsletters to folder',
    description: 'Automatically organize newsletter emails into a dedicated folder',
    category: 'newsletters',
    icon: '📰',
    conditions: [
      {
        type: 'from',
        operator: 'contains',
        value: 'newsletter',
      },
    ],
    actions: [
      {
        type: 'move',
        folderId: '', // Will be filled in by user
        folderName: 'Newsletters',
      },
      {
        type: 'mark_read',
      },
    ],
    matchAll: false, // OR logic
  },

  {
    id: 'unsubscribe-cleaner',
    name: 'Auto-delete promotional emails',
    description: 'Delete emails with "unsubscribe" links (promotional content)',
    category: 'cleanup',
    icon: '🗑️',
    conditions: [
      {
        type: 'subject',
        operator: 'contains',
        value: 'unsubscribe',
      },
    ],
    actions: [
      {
        type: 'delete',
      },
    ],
    matchAll: true, // AND logic
  },

  {
    id: 'boss-highlighter',
    name: 'Flag emails from your boss',
    description: 'Star and keep unread emails from your manager',
    category: 'work',
    icon: '👔',
    conditions: [
      {
        type: 'from',
        operator: 'is',
        value: 'boss@company.com', // User will customize
      },
    ],
    actions: [
      {
        type: 'star',
      },
    ],
    matchAll: true,
  },

  {
    id: 'receipt-organizer',
    name: 'Organize receipts and invoices',
    description: 'Move emails with "receipt" or "invoice" in subject to a folder',
    category: 'work',
    icon: '📄',
    conditions: [
      {
        type: 'subject',
        operator: 'contains',
        value: 'receipt',
      },
    ],
    actions: [
      {
        type: 'move',
        folderId: '', // Will be filled in
        folderName: 'Receipts',
      },
      {
        type: 'mark_read',
      },
    ],
    matchAll: false, // Will match "receipt" OR "invoice"
  },

  {
    id: 'attachment-highlighter',
    name: 'Flag emails with attachments',
    description: 'Star emails that have attachments for easy access',
    category: 'work',
    icon: '📎',
    conditions: [
      {
        type: 'has_attachments',
        operator: 'is',
        value: true,
      },
    ],
    actions: [
      {
        type: 'star',
      },
    ],
    matchAll: true,
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): SimpleRuleTemplate | undefined {
  return SIMPLE_RULE_TEMPLATES.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): SimpleRuleTemplate[] {
  return SIMPLE_RULE_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get all template categories
 */
export function getTemplateCategories(): Array<{ id: string; name: string; count: number }> {
  const categories = new Map<string, number>();

  SIMPLE_RULE_TEMPLATES.forEach(template => {
    const count = categories.get(template.category) || 0;
    categories.set(template.category, count + 1);
  });

  return Array.from(categories.entries()).map(([id, count]) => ({
    id,
    name: getCategoryName(id),
    count,
  }));
}

/**
 * Get human-readable category name
 */
function getCategoryName(category: string): string {
  switch (category) {
    case 'newsletters': return 'Newsletters & Subscriptions';
    case 'work': return 'Work Organization';
    case 'cleanup': return 'Cleanup & Deletion';
    default: return category;
  }
}
