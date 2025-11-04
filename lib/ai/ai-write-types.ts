/**
 * AI Write Service Types
 * 
 * Shared types and constants for AI email generation
 * Safe for client-side import (no API keys)
 */

export type ToneType = 'professional' | 'casual' | 'friendly' | 'formal' | 'persuasive' | 'assertive' | 'empathetic';
export type LengthType = 'short' | 'normal' | 'long';

export interface AIWriteInput {
  prompt?: string;
  bullets?: string[];
  templateName?: string;
  tone: ToneType;
  length: LengthType;
  context?: {
    recipientEmail?: string;
    recipientName?: string;
    subject?: string;
  };
}

export interface AIWriteOutput {
  subject: string;
  body: string;
}

// Email template structure
export interface EmailTemplate {
  name: string;
  description: string;
}

// Email templates
export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  'follow-up': {
    name: 'Follow-up Email',
    description: 'Professional follow-up on a previous conversation',
  },
  'thank-you': {
    name: 'Thank You',
    description: 'Express gratitude and appreciation',
  },
  'introduction': {
    name: 'Introduction',
    description: 'Introduce yourself or your company',
  },
  'meeting-request': {
    name: 'Meeting Request',
    description: 'Request a meeting or call',
  },
  'project-update': {
    name: 'Project Update',
    description: 'Share project status and progress',
  },
  'feedback-request': {
    name: 'Feedback Request',
    description: 'Ask for input or opinions',
  },
  'apology': {
    name: 'Apology',
    description: 'Apologize professionally',
  },
  'congratulations': {
    name: 'Congratulations',
    description: 'Celebrate an achievement',
  },
  'reminder': {
    name: 'Reminder',
    description: 'Gentle reminder about something',
  },
  'announcement': {
    name: 'Announcement',
    description: 'Share news or updates',
  },
};

// Tone descriptions
export function getToneDescription(tone: ToneType): string {
  const descriptions: Record<ToneType, string> = {
    professional: 'Clear, polished, and business-appropriate',
    casual: 'Relaxed and conversational',
    friendly: 'Warm and approachable',
    formal: 'Very polished and traditional',
    persuasive: 'Compelling and action-oriented',
    assertive: 'Direct and confident',
    empathetic: 'Understanding and compassionate',
  };
  return descriptions[tone];
}

// Length descriptions
export function getLengthDescription(length: LengthType): string {
  const descriptions: Record<LengthType, string> = {
    short: 'Brief and to the point (2-3 sentences)',
    normal: 'Standard length (1-2 paragraphs)',
    long: 'Detailed and comprehensive (3+ paragraphs)',
  };
  return descriptions[length];
}

