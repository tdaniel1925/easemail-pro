/**
 * Contacts V4 Search API
 * GET /api/contacts-v4/search - Advanced contact search
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema-contacts-v4';
import { eq, and, or, ilike, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

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

    // Parse query parameters
    const query = searchParams.get('q');
    const accountId = searchParams.get('account');
    const groupsParam = searchParams.get('groups');
    const tagsParam = searchParams.get('tags');
    const companiesParam = searchParams.get('companies');
    const isFavorite = searchParams.get('is_favorite');
    const hasEmail = searchParams.get('has_email');
    const hasPhone = searchParams.get('has_phone');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Parse arrays
    const groups = groupsParam ? groupsParam.split(',').map(g => g.trim()) : [];
    const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : [];
    const companies = companiesParam ? companiesParam.split(',').map(c => c.trim()) : [];

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
    if (query) {
      const searchLower = query.toLowerCase();
      conditions.push(
        or(
          ilike(contactsV4.displayName, `%${searchLower}%`),
          ilike(contactsV4.givenName, `%${searchLower}%`),
          ilike(contactsV4.surname, `%${searchLower}%`),
          ilike(contactsV4.companyName, `%${searchLower}%`),
          ilike(contactsV4.jobTitle, `%${searchLower}%`),
          ilike(contactsV4.notes, `%${searchLower}%`),
          // Search in emails
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${contactsV4.emails}) AS email_obj
            WHERE LOWER(email_obj->>'email') LIKE ${`%${searchLower}%`}
          )`,
          // Search in phone numbers
          sql`EXISTS (
            SELECT 1 FROM jsonb_array_elements(${contactsV4.phoneNumbers}) AS phone_obj
            WHERE phone_obj->>'number' LIKE ${`%${searchLower}%`}
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
    console.error('❌ Search contacts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to search contacts',
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
