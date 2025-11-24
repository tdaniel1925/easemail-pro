/**
 * Bulk Contact Import API
 * POST /api/contacts-v4/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contactsV4 } from '@/lib/db/schema-contacts-v4';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ImportContact {
  givenName?: string;
  surname?: string;
  emails?: Array<{ email: string; type: string }>;
  phoneNumbers?: Array<{ number: string; type: string }>;
  companyName?: string;
  jobTitle?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, contacts } = body as {
      accountId: string;
      contacts: ImportContact[];
    };

    if (!accountId || !contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'accountId and contacts array are required' },
        { status: 400 }
      );
    }

    // Get account info for grant ID and provider
    const { data: accounts } = await supabase
      .from('email_accounts')
      .select('nylas_grant_id, provider')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (!accounts) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    let imported = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Import each contact
    for (const contact of contacts) {
      try {
        // Skip if no email and no name
        if (!contact.givenName && !contact.surname && (!contact.emails || contact.emails.length === 0)) {
          errors++;
          errorDetails.push('Contact must have at least a name or email');
          continue;
        }

        // Check for duplicate email
        if (contact.emails && contact.emails.length > 0) {
          const primaryEmail = contact.emails[0].email;

          const existing = await db.query.contactsV4.findFirst({
            where: and(
              eq(contactsV4.userId, user.id),
              eq(contactsV4.accountId, accountId),
              eq(contactsV4.isDeleted, false)
            ),
          });

          // Simple duplicate check - skip if email exists
          if (existing) {
            const existingEmails = (existing.emails as any[]) || [];
            const isDuplicate = existingEmails.some(
              (e) => e.email?.toLowerCase() === primaryEmail.toLowerCase()
            );

            if (isDuplicate) {
              errors++;
              errorDetails.push(`Duplicate email: ${primaryEmail}`);
              continue;
            }
          }
        }

        // Build display name
        const displayName =
          contact.givenName && contact.surname
            ? `${contact.givenName} ${contact.surname}`
            : contact.givenName || contact.surname || (contact.emails?.[0]?.email) || 'Unknown';

        // Build physical addresses array
        const physicalAddresses: any[] = [];
        if (contact.street || contact.city || contact.state || contact.postalCode || contact.country) {
          physicalAddresses.push({
            type: 'work',
            street_address: contact.street || '',
            city: contact.city || '',
            state: contact.state || '',
            postal_code: contact.postalCode || '',
            country: contact.country || '',
          });
        }

        // Create contact
        await db.insert(contactsV4).values({
          userId: user.id,
          accountId,
          nylasGrantId: accounts.nylas_grant_id,
          provider: accounts.provider as 'google' | 'microsoft',
          source: 'easemail', // Mark as imported
          givenName: contact.givenName || '',
          surname: contact.surname || '',
          displayName,
          emails: contact.emails || [],
          phoneNumbers: contact.phoneNumbers || [],
          physicalAddresses,
          companyName: contact.companyName || '',
          jobTitle: contact.jobTitle || '',
          notes: contact.notes || '',
          syncStatus: 'pending_create', // Will be synced to Nylas later
        });

        imported++;
      } catch (error) {
        console.error('Error importing contact:', error);
        errors++;
        errorDetails.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: contacts.length,
      errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import contacts'
      },
      { status: 500 }
    );
  }
}
