/**
 * AI Write Service Types
 * 
 * Shared types and constants for AI email generation
 * Safe for client-side import (no API keys)
 */

export type ToneType = 'professional' | 'casual' | 'friendly' | 'formal' | 'persuasive';
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

// Email templates
export const EMAIL_TEMPLATES = {
  'follow-up': 'Professional follow-up email',
  'thank-you': 'Thank you email',
  'introduction': 'Introduction email',
  'meeting-request': 'Meeting request',
  'project-update': 'Project status update',
  'feedback-request': 'Request for feedback',
  'apology': 'Apology email',
  'congratulations': 'Congratulations message',
  'reminder': 'Friendly reminder',
  'announcement': 'Announcement email',
};

// Tone descriptions
export function getToneDescription(tone: ToneType): string {
  const descriptions: Record<ToneType, string> = {
    professional: 'Clear, polished, and business-appropriate',
    casual: 'Relaxed and conversational',
    friendly: 'Warm and approachable',
    formal: 'Very polished and traditional',
    persuasive: 'Compelling and action-oriented',
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

