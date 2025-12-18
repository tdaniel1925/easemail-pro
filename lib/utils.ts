import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function getInitials(name: string): string {
  if (!name || name.trim() === '') {
    return '?';
  }
  
  const trimmedName = name.trim();
  const names = trimmedName.split(' ').filter(n => n.length > 0);
  
  if (names.length >= 2) {
    return (names[0][0] + names[1][0]).toUpperCase();
  }
  
  if (trimmedName.length >= 2) {
    return trimmedName.slice(0, 2).toUpperCase();
  }
  
  return trimmedName[0].toUpperCase();
}

export function generateAvatarColor(email: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
  ];
  
  if (!email || email.trim() === '') {
    return colors[0]; // Default color
  }
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Convert text to title case (capitalize first letter of each word)
 * Handles names, titles, and company names properly
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text || text.trim() === '') return '';

  // Words that should stay lowercase in titles (unless they're the first word)
  const smallWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);

  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      // Always capitalize first word
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }

      // Keep small words lowercase unless they're the first word
      if (smallWords.has(word)) {
        return word;
      }

      // Capitalize all other words
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Parse Microsoft Graph API datetime with timezone
 * Graph API returns datetime strings without timezone suffix (e.g., "2025-12-18T19:49:00.0000000")
 * but includes a separate timeZone field. This function handles the conversion properly.
 *
 * @param dateTime - The datetime string from Graph API
 * @param timeZone - The timezone string (e.g., "UTC", "Pacific Standard Time")
 * @returns A Date object representing the correct local time
 */
export function parseGraphDateTime(dateTime: string, timeZone?: string): Date {
  if (!dateTime) return new Date();

  // Remove fractional seconds if present (Graph API returns .0000000)
  const cleanDateTime = dateTime.replace(/\.\d+$/, '');

  // If timezone is UTC or not specified, treat the datetime as UTC
  if (!timeZone || timeZone === 'UTC' || timeZone.toLowerCase().includes('utc')) {
    // Append Z to indicate UTC
    return new Date(cleanDateTime + 'Z');
  }

  // For other timezones, the datetime is already in that timezone
  // We need to parse it as-is (local interpretation) since it represents
  // the time in the specified timezone
  // Note: This is a simplification - for full timezone support, use date-fns-tz

  // Create a date from the datetime string
  // JavaScript will parse it as local time, which is what we want if
  // the event's timezone matches the user's timezone
  const date = new Date(cleanDateTime);

  // If the date is invalid, try with Z suffix as fallback
  if (isNaN(date.getTime())) {
    return new Date(cleanDateTime + 'Z');
  }

  return date;
}

