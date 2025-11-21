/**
 * Unified Search API
 * POST /api/search/unified
 * Search across all data types: emails, contacts, events, attachments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Input validation schema
const searchRequestSchema = z.object({
  query: z.string().min(1).max(500),
  filters: z.object({
    types: z.array(z.enum(['email', 'contact', 'event', 'attachment'])).optional(),
    dateRange: z.object({
      start: z.string().optional(),
      end: z.string().optional(),
    }).optional(),
    accountId: z.string().optional(),
    folderId: z.string().optional(),
  }).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = searchRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { query, filters, limit = 10 } = validation.data;
    const searchTypes = filters?.types || ['email', 'contact', 'event', 'attachment'];

    // Parallel search across all selected data types
    const searchPromises = [];

    if (searchTypes.includes('email')) {
      searchPromises.push(
        searchEmails(query, filters?.accountId, filters?.folderId, limit)
          .catch(err => {
            console.error('[Unified Search] Email search error:', err);
            return { results: [], error: err.message };
          })
      );
    } else {
      searchPromises.push(Promise.resolve({ results: [] }));
    }

    if (searchTypes.includes('contact')) {
      searchPromises.push(
        searchContacts(query, user.id, filters?.accountId, limit)
          .catch(err => {
            console.error('[Unified Search] Contact search error:', err);
            return { results: [], error: err.message };
          })
      );
    } else {
      searchPromises.push(Promise.resolve({ results: [] }));
    }

    if (searchTypes.includes('event')) {
      searchPromises.push(
        searchEvents(query, filters?.accountId, filters?.dateRange, limit)
          .catch(err => {
            console.error('[Unified Search] Event search error:', err);
            return { results: [], error: err.message };
          })
      );
    } else {
      searchPromises.push(Promise.resolve({ results: [] }));
    }

    if (searchTypes.includes('attachment')) {
      searchPromises.push(
        searchAttachments(query, user.id, filters?.accountId, limit)
          .catch(err => {
            console.error('[Unified Search] Attachment search error:', err);
            return { results: [], error: err.message };
          })
      );
    } else {
      searchPromises.push(Promise.resolve({ results: [] }));
    }

    // Execute all searches in parallel
    const [emailResults, contactResults, eventResults, attachmentResults] = await Promise.all(searchPromises);

    const totalResults =
      (emailResults.results?.length || 0) +
      (contactResults.results?.length || 0) +
      (eventResults.results?.length || 0) +
      (attachmentResults.results?.length || 0);

    const took_ms = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      results: {
        emails: emailResults.results || [],
        contacts: contactResults.results || [],
        events: eventResults.results || [],
        attachments: attachmentResults.results || [],
      },
      total: totalResults,
      took_ms,
      errors: {
        email: emailResults.error,
        contact: contactResults.error,
        event: eventResults.error,
        attachment: attachmentResults.error,
      },
    });
  } catch (error: any) {
    console.error('❌ Unified search error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        took_ms: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

/**
 * Search emails via Nylas v3 API
 */
async function searchEmails(query: string, accountId?: string, folderId?: string, limit: number = 10) {
  if (!accountId) {
    return { results: [] };
  }

  try {
    // Call our Nylas v3 email search API
    const searchParams = new URLSearchParams({
      accountId,
      query,
      limit: limit.toString(),
    });

    if (folderId) {
      searchParams.append('folderId', folderId);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search/emails?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Email search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { results: data.emails || [] };
  } catch (error) {
    console.error('[searchEmails] Error:', error);
    throw error;
  }
}

/**
 * Search contacts via existing contacts API
 */
async function searchContacts(query: string, userId: string, accountId?: string, limit: number = 10) {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    if (accountId) {
      searchParams.append('account', accountId);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/contacts-v4/search?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Contact search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { results: data.contacts || [] };
  } catch (error) {
    console.error('[searchContacts] Error:', error);
    throw error;
  }
}

/**
 * Search calendar events
 */
async function searchEvents(query: string, accountId?: string, dateRange?: { start?: string; end?: string }, limit: number = 10) {
  if (!accountId) {
    return { results: [] };
  }

  try {
    const searchParams = new URLSearchParams({
      accountId,
      query,
      limit: limit.toString(),
    });

    if (dateRange?.start) {
      searchParams.append('start', dateRange.start);
    }
    if (dateRange?.end) {
      searchParams.append('end', dateRange.end);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search/events?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Event search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { results: data.events || [] };
  } catch (error) {
    console.error('[searchEvents] Error:', error);
    throw error;
  }
}

/**
 * Search attachments
 */
async function searchAttachments(query: string, userId: string, accountId?: string, limit: number = 10) {
  try {
    const searchParams = new URLSearchParams({
      query,
      limit: limit.toString(),
    });

    if (accountId) {
      searchParams.append('accountId', accountId);
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search/attachments?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`Attachment search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return { results: data.attachments || [] };
  } catch (error) {
    console.error('[searchAttachments] Error:', error);
    throw error;
  }
}
