/**
 * Contacts V4 CRUD API
 * GET /api/contacts-v4 - List contacts
 * POST /api/contacts-v4 - Create contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema-contacts-v4';
import { eq, and, or, ilike, desc, asc, sql } from 'drizzle-orm';
import type { ContactFormData } from '@/lib/types/contacts-v4';

export const dynamic = 'force-dynamic';

/**
 * GET - List contacts with filtering, search, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Query parameters
    const accountId = searchParams.get('account_id');
    const search = searchParams.get('search');
    const source = searchParams.get('source');
    const isFavorite = searchParams.get('is_favorite') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sort_by') || 'name';
    const sortOrder = searchParams.get('sort_order') || 'asc';

    // Build where conditions
    const conditions = [
      eq(contactsV4.userId, user.id),
      eq(contactsV4.isDeleted, false),
    ];

    if (accountId) {
      conditions.push(eq(contactsV4.accountId, accountId));
    }

    if (source) {
      conditions.push(eq(contactsV4.source, source as any));
    }

    if (isFavorite) {
      conditions.push(eq(contactsV4.isFavorite, true));
    }

    // Build query
    let query = db.query.contactsV4.findMany({
      where: and(...conditions),
      limit: limit + 1, // Fetch one extra to check if there are more
      offset,
    });

    // Apply search if provided
    if (search) {
      const searchLower = search.toLowerCase();
      // Match only at the beginning of words (start of string or after space)
      query = db.query.contactsV4.findMany({
        where: and(
          ...conditions,
          or(
            // Match at start of display name or after a space
            sql`LOWER(${contactsV4.displayName}) ~ ${`(^|\\s)${searchLower}`}`,
            // Match at start of given name or after a space
            sql`LOWER(${contactsV4.givenName}) ~ ${`(^|\\s)${searchLower}`}`,
            // Match at start of surname or after a space
            sql`LOWER(${contactsV4.surname}) ~ ${`(^|\\s)${searchLower}`}`,
            // Match at start of company name or after a space
            sql`LOWER(${contactsV4.companyName}) ~ ${`(^|\\s)${searchLower}`}`,
            // Match at start of job title or after a space
            sql`LOWER(${contactsV4.jobTitle}) ~ ${`(^|\\s)${searchLower}`}`,
            // Match emails at the start (before @)
            sql`EXISTS (
              SELECT 1 FROM jsonb_array_elements(${contactsV4.emails}) AS email_obj
              WHERE LOWER(email_obj->>'email') ~ ${`^${searchLower}`}
            )`
          )
        ),
        limit: limit + 1,
        offset,
      });
    }

    // Execute query
    const contacts = await query;

    // Check if there are more results
    const hasMore = contacts.length > limit;
    const resultsToReturn = hasMore ? contacts.slice(0, limit) : contacts;

    // Transform to list item format
    const contactList = resultsToReturn.map(contact => ({
      id: contact.id,
      account_id: contact.accountId,
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

    // Get total count (optional - can be expensive for large datasets)
    const total = await db
      .select({ count: sql<number>`count(*)` })
      .from(contactsV4)
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      contacts: contactList,
      total: Number(total[0].count),
      has_more: hasMore,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('❌ Get contacts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new contact
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { account_id, contact, sync_immediately } = body;

    if (!account_id || !contact) {
      return NextResponse.json(
        { error: 'account_id and contact are required' },
        { status: 400 }
      );
    }

    // Validate that contact has at least email or phone
    if (!contact.emails?.length && !contact.phone_numbers?.length) {
      return NextResponse.json(
        { error: 'Contact must have at least one email or phone number' },
        { status: 400 }
      );
    }

    // Get account details for nylas_grant_id
    const { data: account } = await supabase
      .from('email_accounts')
      .select('nylas_grant_id, email_address')
      .eq('id', account_id)
      .single();

    if (!account || !account.nylas_grant_id) {
      return NextResponse.json(
        { error: 'Account not found or not connected' },
        { status: 404 }
      );
    }

    // Determine provider
    const provider = account.email_address?.includes('@gmail.com') ||
      account.email_address?.includes('@googlemail.com')
      ? 'google'
      : 'microsoft';

    // Prepare contact data
    const contactData = {
      userId: user.id,
      accountId: account_id,
      nylasGrantId: account.nylas_grant_id,
      provider,
      source: 'easemail' as const,
      givenName: contact.given_name || null,
      middleName: contact.middle_name || null,
      surname: contact.surname || null,
      suffix: contact.suffix || null,
      nickname: contact.nickname || null,
      emails: contact.emails || [],
      phoneNumbers: contact.phone_numbers || [],
      physicalAddresses: contact.physical_addresses || [],
      webPages: contact.web_pages || [],
      imAddresses: contact.im_addresses || [],
      jobTitle: contact.job_title || null,
      companyName: contact.company_name || null,
      managerName: contact.manager_name || null,
      officeLocation: contact.office_location || null,
      department: contact.department || null,
      birthday: contact.birthday || null,
      notes: contact.notes || null,
      groups: contact.groups || [],
      tags: contact.tags || [],
      syncStatus: sync_immediately ? 'pending_create' : 'synced',
    };

    // Insert contact
    const [newContact] = await db.insert(contactsV4).values(contactData).returning();

    // TODO: If sync_immediately is true, trigger sync to Nylas

    return NextResponse.json({
      success: true,
      contact: newContact,
    });
  } catch (error: any) {
    console.error('❌ Create contact error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create contact' },
      { status: 500 }
    );
  }
}

// ============================================
// HELPERS
// ============================================

function getPrimaryEmail(emails: any[]): string | null {
  if (!emails || emails.length === 0) return null;

  // Try work, then personal, then first
  return (
    emails.find(e => e.type === 'work')?.email ||
    emails.find(e => e.type === 'personal')?.email ||
    emails[0]?.email ||
    null
  );
}

function getPrimaryPhone(phones: any[]): string | null {
  if (!phones || phones.length === 0) return null;

  // Try mobile, then work, then first
  return (
    phones.find(p => p.type === 'mobile')?.number ||
    phones.find(p => p.type === 'work')?.number ||
    phones[0]?.number ||
    null
  );
}
