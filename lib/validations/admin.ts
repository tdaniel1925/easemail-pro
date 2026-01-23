/**
 * Validation Schemas for Admin API Endpoints
 *
 * Centralized Zod schemas for input validation
 */

import { z } from 'zod';

// API Keys Management
export const apiKeysSchema = z.object({
  keys: z.record(z.string(), z.string().min(1)),
});

// Organization Onboarding
export const organizationOnboardSchema = z.object({
  organizationName: z.string().min(1).max(255),
  adminEmail: z.string().email(),
  adminName: z.string().min(1).max(255),
  plan: z.enum(['free', 'pro', 'business', 'enterprise']).default('free'),
  billingEmail: z.string().email().optional(),
  sendInvitation: z.boolean().default(true),
});

// User Creation
export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(255),
  role: z.enum(['platform_admin', 'admin', 'member', 'viewer']).default('member'),
  organizationId: z.string().uuid().optional(),
  sendInvitation: z.boolean().default(true),
});

// User Update
export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  role: z.enum(['platform_admin', 'admin', 'member', 'viewer']).optional(),
  accountStatus: z.enum(['active', 'suspended', 'pending', 'deactivated']).optional(),
});

// Billing Configuration
export const billingConfigSchema = z.object({
  smsRate: z.number().min(0).max(1),
  aiSummaryRate: z.number().min(0).max(1),
  aiWriteRate: z.number().min(0).max(10),
  voiceMinuteRate: z.number().min(0).max(1),
  storageGbRate: z.number().min(0).max(10),
  billingCycle: z.enum(['monthly', 'usage_based']).default('monthly'),
  gracePeriodDays: z.number().int().min(0).max(90).default(7),
});

// Process Billing
export const processBillingSchema = z.object({
  dryRun: z.boolean().default(false),
  organizationId: z.string().uuid().optional(),
});

// Email Template
export const emailTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  category: z.enum(['onboarding', 'billing', 'notification', 'marketing']).default('notification'),
  isActive: z.boolean().default(true),
});

export const sendTestEmailSchema = z.object({
  templateId: z.string().uuid(),
  recipientEmail: z.string().email(),
  variables: z.record(z.string(), z.any()).optional(),
});

// Pricing Plans
export const pricingPlanSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().min(0),
  interval: z.enum(['month', 'year']),
  features: z.array(z.string()),
  limits: z.object({
    emailAccounts: z.number().int().min(0),
    storage: z.number().int().min(0), // in GB
    smsPerMonth: z.number().int().min(0),
    aiRequestsPerMonth: z.number().int().min(0),
  }),
  isActive: z.boolean().default(true),
});

// Team Member Invite
export const teamMemberInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  name: z.string().min(1).max(255).optional(),
});

// Bulk Operations
export const bulkOperationSchema = z.object({
  messageIds: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['delete', 'archive', 'markRead', 'markUnread', 'move', 'star', 'unstar', 'snooze', 'spam']),
  value: z.string().optional(), // For 'move' and 'snooze' actions
});

// Contact Import
export const contactImportSchema = z.object({
  contacts: z.array(z.object({
    email: z.string().email().optional(),
    displayName: z.string().min(1).max(255),
    givenName: z.string().max(100).optional(),
    surname: z.string().max(100).optional(),
    companyName: z.string().max(255).optional(),
    jobTitle: z.string().max(255).optional(),
    phoneNumbers: z.array(z.object({
      number: z.string(),
      type: z.enum(['mobile', 'work', 'home', 'other']).default('mobile'),
    })).optional(),
    addresses: z.array(z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      type: z.enum(['work', 'home', 'other']).default('work'),
    })).optional(),
    notes: z.string().max(2000).optional(),
  })).min(1).max(1000),
});

// SMS Send
export const smsSendSchema = z.object({
  to: z.string().min(10).max(20), // Phone number
  message: z.string().min(1).max(1600), // SMS character limit
  contactId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
});

// Rule Creation/Update
export const emailRuleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(100).default(50),
  conditions: z.object({
    type: z.enum(['all', 'any']).default('all'),
    rules: z.array(z.object({
      field: z.enum(['from', 'to', 'subject', 'body', 'hasAttachment', 'isStarred']),
      operator: z.enum(['contains', 'equals', 'startsWith', 'endsWith', 'matches', 'exists']),
      value: z.string().optional(),
    })).min(1),
  }),
  actions: z.array(z.object({
    type: z.enum(['move', 'label', 'star', 'archive', 'delete', 'markRead', 'forward']),
    value: z.string().optional(),
  })).min(1),
  accountId: z.string().uuid().optional(),
});

// Calendar Event
export const calendarEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().default(false),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional(),
    status: z.enum(['accepted', 'declined', 'tentative', 'needs-action']).optional(),
  })).optional(),
  reminders: z.array(z.object({
    method: z.enum(['email', 'popup']),
    minutesBefore: z.number().int().min(0).max(40320), // Max 4 weeks
  })).optional(),
  recurrence: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().min(1).max(999),
    until: z.string().datetime().optional(),
    count: z.number().int().min(1).optional(),
  }).optional(),
});

// Export for easy usage
export const adminSchemas = {
  apiKeys: apiKeysSchema,
  organizationOnboard: organizationOnboardSchema,
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  billingConfig: billingConfigSchema,
  processBilling: processBillingSchema,
  emailTemplate: emailTemplateSchema,
  sendTestEmail: sendTestEmailSchema,
  pricingPlan: pricingPlanSchema,
  teamMemberInvite: teamMemberInviteSchema,
  bulkOperation: bulkOperationSchema,
  contactImport: contactImportSchema,
  smsSend: smsSendSchema,
  emailRule: emailRuleSchema,
  calendarEvent: calendarEventSchema,
};
