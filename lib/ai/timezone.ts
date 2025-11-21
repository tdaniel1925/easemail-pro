/**
 * Shared Timezone Utility
 * Handles timezone detection and formatting for AI features
 */

/**
 * Get client timezone from request headers or default to UTC
 */
export function getClientTimezone(headers?: Headers | null): string {
  if (!headers) return 'UTC';

  const timezone = headers.get('x-timezone') || headers.get('timezone');
  return timezone || 'UTC';
}

/**
 * Get current local time in a specific timezone
 */
export function getCurrentLocalTime(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
    return formatter.format(now);
  } catch (error) {
    console.error(`[Timezone] Invalid timezone: ${timezone}`, error);
    return new Date().toLocaleString();
  }
}

/**
 * Build timezone context string for AI prompts
 */
export function buildTimezoneContext(timezone: string): string {
  const currentTime = getCurrentLocalTime(timezone);

  return `Current time: ${currentTime}
User timezone: ${timezone}

When parsing dates/times:
- If user says "tomorrow at 3pm", calculate based on current time above
- If user says "next Monday", find the next Monday from today
- Always use the user's timezone (${timezone})
- Return times in ISO 8601 format`;
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get timezone offset in hours
 */
export function getTimezoneOffset(timezone: string): number {
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  } catch {
    return 0;
  }
}
