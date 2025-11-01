/**
 * Email Templates - Corporate Grey Theme
 * All email templates for EaseMail
 */

// Export all email templates
export * from './team-invite';
export * from './signup-confirmation';
export * from './password-reset';
export * from './magic-link';

// Template types
export type EmailTemplate = 
  | 'team-invite'
  | 'signup-confirmation'
  | 'password-reset'
  | 'magic-link';

// Email template metadata
export const EMAIL_TEMPLATES = {
  'team-invite': {
    name: 'Team Invitation',
    description: 'Invite a user to join your team',
    trigger: 'Manual - when admin invites a member',
  },
  'signup-confirmation': {
    name: 'Signup Confirmation',
    description: 'Verify email address after signup',
    trigger: 'Auto - when user signs up',
  },
  'password-reset': {
    name: 'Password Reset',
    description: 'Reset password link',
    trigger: 'Auto - when user requests password reset',
  },
  'magic-link': {
    name: 'Magic Link',
    description: 'Passwordless sign-in link',
    trigger: 'Auto - when user requests magic link',
  },
} as const;

