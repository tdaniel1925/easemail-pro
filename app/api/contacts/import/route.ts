import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';

interface CSVRow {
  'First Name'?: string;
  'Last Name'?: string;
  'Email'?: string;
  'Phone'?: string;
  'Company'?: string;
  'Job Title'?: string;
  'Location'?: string;
  'Website'?: string;
  'LinkedIn'?: string;
  'Twitter'?: string;
  'Tags'?: string;
  'Notes'?: string;
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contacts: contactsData } = await request.json();

    if (!Array.isArray(contactsData) || contactsData.length === 0) {
      return NextResponse.json(
        { error: 'Invalid data format' },
        { status: 400 }
      );
    }

    console.log('📥 Importing', contactsData.length, 'contacts');

    const imported = [];
    const errors = [];

    for (const row of contactsData) {
      try {
        // Skip if no email
        if (!row.Email || !row.Email.trim()) {
          errors.push({ row, error: 'Missing email' });
          continue;
        }

        const email = row.Email.trim().toLowerCase();

        // Check if contact already exists
        const existing = await db.query.contacts.findFirst({
          where: (contacts, { and, eq }) => and(
            eq(contacts.userId, user.id),
            eq(contacts.email, email)
          ),
        });

        if (existing) {
          errors.push({ row, error: 'Contact already exists' });
          continue;
        }

        // Parse tags
        let tags: string[] = [];
        if (row.Tags) {
          tags = row.Tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }

        // Create contact
        const firstName = row['First Name']?.trim() || '';
        const lastName = row['Last Name']?.trim() || '';

        const newContact = await db.insert(contacts).values({
          userId: user.id,
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null,
          displayName: firstName || email.split('@')[0],
          phone: row.Phone?.trim() || null,
          company: row.Company?.trim() || null,
          jobTitle: row['Job Title']?.trim() || null,
          location: row.Location?.trim() || null,
          website: row.Website?.trim() || null,
          linkedinUrl: row.LinkedIn?.trim() || null,
          twitterHandle: row.Twitter?.trim() || null,
          notes: row.Notes?.trim() || null,
          tags,
        }).returning();

        imported.push(newContact[0]);
      } catch (error: any) {
        console.error('Error importing contact:', error);
        errors.push({ row, error: error.message || 'Unknown error' });
      }
    }

    console.log(`✅ Imported ${imported.length} contacts, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      imported: imported.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error: any) {
    console.error('❌ Import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import contacts' },
      { status: 500 }
    );
  }
}

