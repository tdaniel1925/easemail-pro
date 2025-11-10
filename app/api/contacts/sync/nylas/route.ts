import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import Nylas from 'nylas';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Increase timeout for syncing many contacts

/**
 * Sync contacts from Nylas (Gmail/Outlook/etc) to local database
 * POST /api/contacts/sync/nylas
 * Body: { grantId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { grantId } = await request.json();

    if (!grantId) {
      return NextResponse.json(
        { error: 'Grant ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Starting Nylas contact sync for grant:', grantId);

    // Initialize Nylas client
    const nylas = new Nylas({
      apiKey: process.env.NYLAS_API_KEY!,
      apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
    });

    // Fetch contacts from Nylas
    let allNylasContacts: any[] = [];
    let pageToken: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const response = await nylas.contacts.list({
        identifier: grantId,
        queryParams: {
          limit: 50,
          ...(pageToken && { pageToken }),
        },
      });

      allNylasContacts = allNylasContacts.concat(response.data);

      // Check if there are more pages
      hasMore = !!response.nextCursor;
      pageToken = response.nextCursor;

      console.log(`📥 Fetched ${response.data.length} contacts (total: ${allNylasContacts.length})`);
    }

    console.log(`✅ Retrieved ${allNylasContacts.length} contacts from Nylas`);

    // Process and insert contacts
    const imported = [];
    const skipped = [];
    const errors = [];

    for (const nylasContact of allNylasContacts) {
      try {
        // Get primary email
        const primaryEmail = nylasContact.emails?.find((e: any) => e.type === 'work' || e.type === 'personal')?.email
          || nylasContact.emails?.[0]?.email;

        // Skip if no email
        if (!primaryEmail) {
          skipped.push({ contact: nylasContact, reason: 'No email address' });
          continue;
        }

        const emailLower = primaryEmail.toLowerCase();

        // Check if contact already exists
        const existing = await db.query.contacts.findFirst({
          where: and(
            eq(contacts.userId, user.id),
            eq(contacts.email, emailLower)
          ),
        });

        if (existing) {
          skipped.push({ contact: nylasContact, reason: 'Already exists' });
          continue;
        }

        // Get primary phone
        const primaryPhone = nylasContact.phoneNumbers?.find((p: any) => p.type === 'work' || p.type === 'mobile')?.number
          || nylasContact.phoneNumbers?.[0]?.number;

        // Get company info
        const company = nylasContact.companyName || null;
        const jobTitle = nylasContact.jobTitle || null;

        // Build full name
        const firstName = nylasContact.givenName || null;
        const lastName = nylasContact.surname || null;
        const fullName = firstName && lastName
          ? `${firstName} ${lastName}`
          : firstName || lastName || null;
        const displayName = fullName || emailLower.split('@')[0];

        // Get website/links
        const website = nylasContact.webPages?.[0]?.url || null;

        // Get notes
        const notes = nylasContact.notes ? nylasContact.notes.join('\n') : null;

        // Get groups as tags
        const tags = nylasContact.groups?.map((g: any) => g.name || g.id) || [];

        // Insert contact
        const newContact = await db.insert(contacts).values({
          userId: user.id,
          email: emailLower,
          firstName,
          lastName,
          fullName,
          displayName,
          phone: primaryPhone,
          company,
          jobTitle,
          website,
          notes,
          tags,
          // Store Nylas ID for future syncing
          provider: 'nylas',
          providerContactId: nylasContact.id,
        }).returning();

        imported.push(newContact[0]);
      } catch (error: any) {
        console.error('Error importing contact:', error);
        errors.push({
          contact: nylasContact,
          error: error.message || 'Unknown error'
        });
      }
    }

    console.log(`✅ Sync complete: ${imported.length} imported, ${skipped.length} skipped, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      total: allNylasContacts.length,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        importedContacts: imported,
        skippedReasons: skipped.slice(0, 10), // First 10 for debugging
        errorDetails: errors.slice(0, 10), // First 10 for debugging
      },
    });
  } catch (error: any) {
    console.error('❌ Nylas contact sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync contacts from Nylas',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Get sync status for an account
 * GET /api/contacts/sync/nylas?grantId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const grantId = searchParams.get('grantId');

    if (!grantId) {
      return NextResponse.json(
        { error: 'Grant ID is required' },
        { status: 400 }
      );
    }

    // Count synced contacts for this grant
    const syncedContacts = await db.query.contacts.findMany({
      where: and(
        eq(contacts.userId, user.id),
        eq(contacts.provider, 'nylas')
      ),
    });

    return NextResponse.json({
      success: true,
      grantId,
      syncedCount: syncedContacts.length,
      lastSync: syncedContacts.length > 0
        ? Math.max(...syncedContacts.map(c => new Date(c.updatedAt).getTime()))
        : null,
    });
  } catch (error: any) {
    console.error('❌ Get sync status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
