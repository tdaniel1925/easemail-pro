/**
 * Contacts V4 Search API
 * GET /api/contacts-v4/search - Advanced contact search
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema-contacts-v4';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ✅ SECURITY: Input validation schemas to prevent SQL injection
const searchParamsSchema = z.object({
  q: z.string().max(500).optional(),
  account: z.string().uuid().optional(),
  groups: z.string().max(1000).optional(),
  tags: z.string().max(1000).optional(),
  companies: z.string().max(1000).optional(),
  is_favorite: z.enum(['true', 'false']).optional(),
  has_email: z.enum(['true', 'false']).optional(),
  has_phone: z.enum(['true', 'false']).optional(),
  source: z.enum(['address_book', 'domain', 'inbox', 'easemail']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// Sanitize search strings to prevent SQL injection
const sanitizeSearchString = (input: string): string => {
  // Remove SQL special characters and limit length
  return input
    .replace(/[%;\\]/g, '') // Remove SQL wildcards and escape chars
    .substring(0, 255);
};

// Validate array items
const validateArrayItems = (items: string[], maxLength: number = 100): string[] => {
  return items
    .filter(item => item.length > 0 && item.length <= maxLength)
    .map(item => sanitizeSearchString(item))
    .slice(0, 50); // Limit array size
};

/**
 * GET - Advanced contact search
 * Query params:
 * - q: Search query (searches name, email, company, job title)
 * - account: Account ID filter
 * - groups: Comma-separated group names
 * - tags: Comma-separated tags
 * - companies: Comma-separated company names
 * - is_favorite: Filter by favorite status
 * - has_email: Filter contacts with email
 * - has_phone: Filter contacts with phone
 * - source: Filter by source (address_book, domain, inbox, easemail)
 * - limit: Results per page (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // ✅ SECURITY: Validate all query parameters
    const rawParams = {
      q: searchParams.get('q') || undefined,
      account: searchParams.get('account') || undefined,
      groups: searchParams.get('groups') || undefined,
      tags: searchParams.get('tags') || undefined,
      companies: searchParams.get('companies') || undefined,
      is_favorite: searchParams.get('is_favorite') || undefined,
      has_email: searchParams.get('has_email') || undefined,
      has_phone: searchParams.get('has_phone') || undefined,
      source: searchParams.get('source') || undefined,
      limit: searchParams.get('limit') || '50',
      offset: searchParams.get('offset') || '0',
    };

    // Validate parameters against schema
    const validationResult = searchParamsSchema.safeParse(rawParams);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid search parameters',
        details: validationResult.error.issues,
      }, { status: 400 });
    }

    const validated = validationResult.data;

    // Parse and sanitize query parameters
    const query = validated.q ? sanitizeSearchString(validated.q) : null;
    const accountId = validated.account;
    const isFavorite = validated.is_favorite;
    const hasEmail = validated.has_email;
    const hasPhone = validated.has_phone;
    const source = validated.source;
    const limit = validated.limit || 50;
    const offset = validated.offset || 0;

    // Parse and validate arrays
    const groups = validated.groups ? validateArrayItems(validated.groups.split(',').map(g => g.trim())) : [];
    const tags = validated.tags ? validateArrayItems(validated.tags.split(',').map(t => t.trim())) : [];
    const companies = validated.companies ? validateArrayItems(validated.companies.split(',').map(c => c.trim())) : [];

    // Build base conditions
    const conditions = [
      eq(contactsV4.userId, user.id),
      eq(contactsV4.isDeleted, false),
    ];

    // Account filter
    if (accountId) {
      conditions.push(eq(contactsV4.accountId, accountId));
    }

    // Source filter
    if (source) {
      conditions.push(eq(contactsV4.source, source as any));
    }

    // Favorite filter
    if (isFavorite === 'true') {
      conditions.push(eq(contactsV4.isFavorite, true));
    } else if (isFavorite === 'false') {
      conditions.push(eq(contactsV4.isFavorite, false));
    }

    // Has email filter
    if (hasEmail === 'true') {
      conditions.push(sql`jsonb_array_length(${contactsV4.emails}) > 0`);
    }

    // Has phone filter
    if (hasPhone === 'true') {
      conditions.push(sql`jsonb_array_length(${contactsV4.phoneNumbers}) > 0`);
    }

    // Company filter
    if (companies.length > 0) {
      const companyConditions = companies.map(company =>
        ilike(contactsV4.companyName, `%${company}%`)
      );
      conditions.push(or(...companyConditions)!);
    }

    // Groups filter (JSONB array contains)
    if (groups.length > 0) {
      const groupConditions = groups.map(group =>
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${contactsV4.groups}) AS group_obj
          WHERE LOWER(group_obj->>'name') = LOWER(${group})
        )`
      );
      conditions.push(or(...groupConditions)!);
    }

    // Tags filter (JSONB array contains)
    if (tags.length > 0) {
      const tagConditions = tags.map(tag =>
        sql`${contactsV4.tags} @> ${JSON.stringify([tag])}`
      );
      conditions.push(or(...tagConditions)!);
    }

    // Text search across multiple fields
    // ✅ SECURITY: Using sanitized query (already validated and sanitized above)
    if (query) {
      const searchPattern = `%${query}%`;
      conditions.push(
        or(
          ilike(contactsV4.displayName, searchPattern),
          ilike(contactsV4.givenName, searchPattern),
          ilike(contactsV4.surname, searchPattern),
          ilike(contactsV4.companyName, searchPattern),
          ilike(contactsV4.jobTitle, searchPattern),
          ilike(contactsV4.notes, searchPattern),
          // Search in emails - using parameterized query
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${contactsV4.emails}) AS email_obj
            WHERE LOWER(email_obj->>'email') LIKE LOWER(${searchPattern})
          )`,
          // Search in phone numbers - using parameterized query
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${contactsV4.phoneNumbers}) AS phone_obj
            WHERE phone_obj->>'number' LIKE ${searchPattern}
          )`
        )!
      );
    }

    // Execute query
    const contacts = await db.query.contactsV4.findMany({
      where: and(...conditions),
      limit: limit + 1, // Fetch one extra to check for more
      offset,
      orderBy: [
        // Favorite contacts first
        sql`${contactsV4.isFavorite} DESC`,
        // Then by display name
        sql`${contactsV4.displayName} ASC`,
      ],
    });

    // Check if there are more results
    const hasMore = contacts.length > limit;
    const resultsToReturn = hasMore ? contacts.slice(0, limit) : contacts;

    // Transform to list format
    const contactList = resultsToReturn.map(contact => ({
      id: contact.id,
      display_name: contact.displayName,
      primary_email: getPrimaryEmail(contact.emails as any),
      primary_phone: getPrimaryPhone(contact.phoneNumbers as any),
      job_title: contact.jobTitle,
      company_name: contact.companyName,
      picture_url: contact.pictureUrl,
      is_favorite: contact.isFavorite,
      sync_status: contact.syncStatus,
      groups: (contact.groups as any)?.map((g: any) => g.name) || [],
      tags: (contact.tags as any) || [],
    }));

    // Get total count for the search
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contactsV4)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      contacts: contactList,
      total: Number(totalResult[0].count),
      has_more: hasMore,
      limit,
      offset,
      filters_applied: {
        query: query || null,
        account: accountId || null,
        groups: groups.length > 0 ? groups : null,
        tags: tags.length > 0 ? tags : null,
        companies: companies.length > 0 ? companies : null,
        is_favorite: isFavorite || null,
        has_email: hasEmail || null,
        has_phone: hasPhone || null,
        source: source || null,
      },
    });
  } catch (error: any) {
    // ✅ SECURITY: Log detailed error internally, return generic message
    console.error('❌ Search contacts error:', error);

    // Return generic error without leaking internal details
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search contacts',
      },
      { status: 500 }
    );
  }
}

// ============================================
// HELPERS
// ============================================

function getPrimaryEmail(emails: any[]): string | null {
  if (!emails || emails.length === 0) return null;

  return (
    emails.find(e => e.type === 'work')?.email ||
    emails.find(e => e.type === 'personal')?.email ||
    emails[0]?.email ||
    null
  );
}

function getPrimaryPhone(phones: any[]): string | null {
  if (!phones || phones.length === 0) return null;

  return (
    phones.find(p => p.type === 'mobile')?.number ||
    phones.find(p => p.type === 'work')?.number ||
    phones[0]?.number ||
    null
  );
}
