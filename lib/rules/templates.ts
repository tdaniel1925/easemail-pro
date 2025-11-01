/**
 * Pre-built Rule Templates
 * 
 * Common automation rules that users can quickly apply
 */

import type { RuleTemplate, TemplateCategory } from './types';

export const ruleTemplates: Omit<RuleTemplate, 'id' | 'timesUsed' | 'createdAt'>[] = [
  // VIP Category
  {
    name: 'VIP Inbox',
    description: 'Automatically star emails from your most important contacts',
    category: 'vip',
    icon: '⭐',
    isPopular: true,
    conditions: {
      logic: 'OR',
      conditions: [
        {
          field: 'from_email',
          operator: 'in_list',
          value: [], // User will customize
        },
      ],
    },
    actions: [
      {
        type: 'star',
      },
      {
        type: 'send_notification',
        title: 'VIP Email',
        message: 'You received an email from a VIP contact',
      } as any,
    ],
  },

  // Organization Category
  {
    name: 'Newsletter Archive',
    description: 'Automatically archive newsletters and marketing emails',
    category: 'organization',
    icon: '📰',
    isPopular: true,
    conditions: {
      logic: 'OR',
      conditions: [
        {
          field: 'subject',
          operator: 'contains',
          value: 'newsletter',
        },
        {
          field: 'subject',
          operator: 'contains',
          value: 'unsubscribe',
        },
        {
          field: 'from_email',
          operator: 'contains',
          value: 'noreply',
        },
      ],
    },
    actions: [
      {
        type: 'archive',
      },
      {
        type: 'mark_as_read',
      },
      {
        type: 'add_label',
        label: 'Newsletters',
      } as any,
    ],
  },

  {
    name: 'Receipt Organizer',
    description: 'Label and archive receipts and invoices automatically',
    category: 'organization',
    icon: '🧾',
    isPopular: true,
    conditions: {
      logic: 'OR',
      conditions: [
        {
          field: 'subject',
          operator: 'contains',
          value: 'receipt',
        },
        {
          field: 'subject',
          operator: 'contains',
          value: 'invoice',
        },
        {
          field: 'has_attachments',
          operator: 'is',
          value: true,
        },
      ],
    },
    actions: [
      {
        type: 'add_label',
        label: 'Receipts',
      } as any,
      {
        type: 'move_to_folder',
        folder: 'Receipts',
      } as any,
    ],
  },

  // Productivity Category
  {
    name: 'Follow-up Reminder',
    description: 'Get reminded if no reply is received within 3 days',
    category: 'productivity',
    icon: '⏰',
    isPopular: false,
    conditions: {
      logic: 'AND',
      conditions: [
        {
          field: 'is_starred',
          operator: 'is',
          value: true,
        },
      ],
    },
    actions: [
      {
        type: 'remind_if_no_reply',
        hours: 72,
      } as any,
    ],
  },

  {
    name: 'Weekend Snooze',
    description: 'Snooze weekend emails until Monday morning',
    category: 'productivity',
    icon: '🌅',
    isPopular: false,
    conditions: {
      logic: 'OR',
      conditions: [
        {
          field: 'day_of_week',
          operator: 'is',
          value: 0, // Sunday
        },
        {
          field: 'day_of_week',
          operator: 'is',
          value: 6, // Saturday
        },
      ],
    },
    actions: [
      {
        type: 'snooze_until',
        date: 'next-monday-9am', // Placeholder
      } as any,
    ],
  },

  // Cleanup Category
  {
    name: 'Auto-delete Old Promotions',
    description: 'Automatically delete promotional emails older than 30 days',
    category: 'cleanup',
    icon: '🗑️',
    isPopular: false,
    conditions: {
      logic: 'AND',
      conditions: [
        {
          field: 'label',
          operator: 'contains',
          value: 'Promotions',
        },
        {
          field: 'received_at',
          operator: 'less_than',
          value: 'now-30days', // Placeholder
        },
      ],
    },
    actions: [
      {
        type: 'delete',
      },
    ],
  },

  {
    name: 'Large Attachment Alert',
    description: 'Get notified when receiving emails with large attachments',
    category: 'cleanup',
    icon: '📎',
    isPopular: false,
    conditions: {
      logic: 'AND',
      conditions: [
        {
          field: 'has_attachments',
          operator: 'is',
          value: true,
        },
        {
          field: 'attachment_size',
          operator: 'greater_than',
          value: 10485760, // 10MB
        },
      ],
    },
    actions: [
      {
        type: 'send_notification',
        title: 'Large Attachment',
        message: 'Email with large attachment received',
      } as any,
      {
        type: 'add_label',
        label: 'Large Files',
      } as any,
    ],
  },

  // Automation Category
  {
    name: 'AI Auto-categorize',
    description: 'Use AI to automatically categorize incoming emails',
    category: 'automation',
    icon: '🤖',
    isPopular: true,
    conditions: {
      logic: 'AND',
      conditions: [
        {
          field: 'is_read',
          operator: 'is',
          value: false,
        },
      ],
    },
    actions: [
      {
        type: 'ai_categorize',
      },
    ],
  },

  {
    name: 'Smart Reply Suggestions',
    description: 'Get AI-powered reply suggestions for important emails',
    category: 'automation',
    icon: '✨',
    isPopular: false,
    conditions: {
      logic: 'OR',
      conditions: [
        {
          field: 'is_starred',
          operator: 'is',
          value: true,
        },
        {
          field: 'sender_in_contacts',
          operator: 'is',
          value: true,
        },
      ],
    },
    actions: [
      {
        type: 'ai_suggest_reply',
      },
    ],
  },
];

/**
 * Seed rule templates into the database
 */
export async function seedRuleTemplates() {
  const { db } = await import('../db/drizzle');
  const { ruleTemplates: templatesTable } = await import('../db/schema');

  console.log('🌱 Seeding rule templates...');

  for (const template of ruleTemplates) {
    try {
      await db.insert(templatesTable).values({
        name: template.name,
        description: template.description,
        category: template.category,
        icon: template.icon,
        conditions: template.conditions,
        actions: template.actions,
        isPopular: template.isPopular,
        timesUsed: 0,
      });

      console.log(`✅ Seeded template: ${template.name}`);
    } catch (error) {
      console.error(`❌ Error seeding template ${template.name}:`, error);
    }
  }

  console.log('✅ Rule templates seeding complete!');
}

