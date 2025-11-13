/**
 * Error Resolution Guides for Email Sync
 * Maps common sync errors to user-friendly messages with actionable solutions
 */

export interface ErrorResolution {
  errorPattern: RegExp | string;
  title: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  actions: Array<{
    label: string;
    type: 'reconnect' | 'retry' | 'wait' | 'external' | 'support';
    waitTime?: number; // in minutes
    url?: string;
  }>;
  learnMoreUrl?: string;
}

export const syncErrorGuides: ErrorResolution[] = [
  // Authentication Errors
  {
    errorPattern: /401|unauthorized|authentication|invalid.?credentials|token.?expired/i,
    title: 'Account Connection Expired',
    description: 'Your email account connection needs to be refreshed. This happens when your email provider requires re-authentication for security.',
    severity: 'error',
    actions: [
      { label: 'Reconnect Account', type: 'reconnect' }
    ],
    learnMoreUrl: '/help/reconnecting-accounts'
  },

  // Rate Limit Errors
  {
    errorPattern: /429|rate.?limit|too.?many.?requests|quota.?exceeded/i,
    title: 'Rate Limit Reached',
    description: 'Your email provider has temporarily limited sync requests. This is normal for large mailboxes and protects your account. Syncing will automatically resume in a few minutes.',
    severity: 'warning',
    actions: [
      { label: 'Wait 5 Minutes', type: 'wait', waitTime: 5 },
      { label: 'Retry Now', type: 'retry' }
    ],
    learnMoreUrl: '/help/rate-limits'
  },

  // Permission Errors
  {
    errorPattern: /403|forbidden|permission|access.?denied|insufficient.?scope/i,
    title: 'Permission Issue',
    description: 'EaseMail doesn\'t have the necessary permissions to sync your emails. You may need to grant additional permissions when reconnecting.',
    severity: 'error',
    actions: [
      { label: 'Reconnect with Permissions', type: 'reconnect' }
    ],
    learnMoreUrl: '/help/permissions'
  },

  // Network/Timeout Errors
  {
    errorPattern: /timeout|ETIMEDOUT|ECONNREFUSED|network.?error|connection.?failed|ENOTFOUND/i,
    title: 'Connection Timeout',
    description: 'Unable to connect to your email provider. This could be a temporary network issue or your email provider may be experiencing downtime.',
    severity: 'warning',
    actions: [
      { label: 'Retry Sync', type: 'retry' },
      { label: 'Check Provider Status', type: 'external', url: 'https://status.google.com/dashboard' }
    ],
    learnMoreUrl: '/help/connection-issues'
  },

  // Mailbox Full/Quota Errors
  {
    errorPattern: /quota|mailbox.?full|storage.?exceeded|insufficient.?storage/i,
    title: 'Mailbox Storage Full',
    description: 'Your email mailbox has reached its storage limit. You\'ll need to free up space in your email account before syncing can continue.',
    severity: 'error',
    actions: [
      { label: 'Manage Mailbox Storage', type: 'external', url: 'https://mail.google.com/mail/u/0/#settings/fwdandpop' }
    ],
    learnMoreUrl: '/help/storage-limits'
  },

  // Provider-Specific Errors
  {
    errorPattern: /IMAP|SMTP|POP3|server.?error/i,
    title: 'Email Server Error',
    description: 'Your email provider\'s server encountered an error. This is usually temporary and will resolve automatically.',
    severity: 'warning',
    actions: [
      { label: 'Wait and Retry', type: 'wait', waitTime: 10 },
      { label: 'Retry Now', type: 'retry' }
    ],
    learnMoreUrl: '/help/server-errors'
  },

  // Nylas-Specific Errors
  {
    errorPattern: /nylas|webhook|grant.?id|continuation.?token/i,
    title: 'Sync Service Error',
    description: 'There was an issue with our email sync service. Our team has been notified and will investigate.',
    severity: 'error',
    actions: [
      { label: 'Retry Sync', type: 'retry' },
      { label: 'Contact Support', type: 'support' }
    ],
    learnMoreUrl: '/help/service-errors'
  },

  // Database Errors
  {
    errorPattern: /database|postgres|supabase|CONNECT_TIMEOUT|query.?failed/i,
    title: 'Database Connection Error',
    description: 'Temporary issue connecting to our database. This is usually brief and will resolve automatically.',
    severity: 'warning',
    actions: [
      { label: 'Retry in 1 Minute', type: 'wait', waitTime: 1 },
      { label: 'Retry Now', type: 'retry' }
    ],
    learnMoreUrl: '/help/database-errors'
  },

  // Generic/Unknown Errors
  {
    errorPattern: /.*/,
    title: 'Sync Error',
    description: 'An unexpected error occurred during sync. Our team has been notified. Please try again in a few minutes.',
    severity: 'error',
    actions: [
      { label: 'Retry Sync', type: 'retry' },
      { label: 'Contact Support', type: 'support' }
    ],
    learnMoreUrl: '/help/troubleshooting'
  }
];

/**
 * Finds the appropriate error resolution guide for a given error message
 * @param errorMessage The error message from the sync operation
 * @returns The matching error resolution guide
 */
export function getErrorResolution(errorMessage: string): ErrorResolution {
  for (const guide of syncErrorGuides) {
    if (typeof guide.errorPattern === 'string') {
      if (errorMessage.toLowerCase().includes(guide.errorPattern.toLowerCase())) {
        return guide;
      }
    } else if (guide.errorPattern instanceof RegExp) {
      if (guide.errorPattern.test(errorMessage)) {
        return guide;
      }
    }
  }

  // Return generic error guide as fallback
  return syncErrorGuides[syncErrorGuides.length - 1];
}

/**
 * Formats wait time into a human-readable string
 * @param minutes Number of minutes to wait
 * @returns Formatted string like "5 minutes" or "1 hour"
 */
export function formatWaitTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
