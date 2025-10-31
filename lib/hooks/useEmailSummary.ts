/**
 * useEmailSummary Hook
 * Fetches AI summary for an email with caching
 */

import { useQuery } from '@tanstack/react-query';

interface Email {
  id: string;
  subject: string;
  snippet: string;
  fromName?: string;
  bodyText?: string;
}

interface SummaryResponse {
  emailId: string;
  summary: string;
  cached: boolean;
  tokens?: number;
  error?: string;
}

async function fetchSummary(email: Email): Promise<SummaryResponse> {
  const response = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      emailId: email.id,
      subject: email.subject,
      snippet: email.snippet,
      fromName: email.fromName,
      bodyText: email.bodyText,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate summary');
  }

  return response.json();
}

export function useEmailSummary(email: Email, enabled: boolean = false) {
  return useQuery({
    queryKey: ['email-summary', email.id],
    queryFn: () => fetchSummary(email),
    enabled, // Only fetch when enabled (viewport visible)
    staleTime: Infinity, // Never refetch - summaries don't change
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours (replaces cacheTime)
    retry: 1, // Only retry once on failure
  });
}

