import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

// Flexible row format - can use camelCase (from mapping) or original CSV column names
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
  // Support camelCase from mapping
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  tags?: string;
  notes?: string;
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
        // Support both camelCase (from mapping) and Title Case (from template)
        const getField = (camelCase: string, titleCase: string) =>
          row[camelCase]?.trim() || row[titleCase]?.trim() || '';

        // Skip if no email
        const email = getField('email', 'Email');
        if (!email) {
          errors.push({ row, error: 'Missing email' });
          continue;
        }

        const emailLower = email.toLowerCase();

        // Check if contact already exists
        const existing = await db.query.contacts.findFirst({
          where: (contacts, { and, eq }) => and(
            eq(contacts.userId, user.id),
            eq(contacts.email, emailLower)
          ),
        });

        if (existing) {
          errors.push({ row, error: 'Contact already exists' });
          continue;
        }

        // Parse tags
        let tagsList: string[] = [];
        const tagsField = getField('tags', 'Tags');
        if (tagsField) {
          tagsList = tagsField.split(',').map((t: string) => t.trim()).filter(Boolean);
        }

        // Get all fields
        const firstName = getField('firstName', 'First Name');
        const lastName = getField('lastName', 'Last Name');
        const phone = getField('phone', 'Phone');
        const company = getField('company', 'Company');
        const jobTitle = getField('jobTitle', 'Job Title');
        const location = getField('location', 'Location');
        const website = getField('website', 'Website');
        const linkedin = getField('linkedin', 'LinkedIn');
        const twitter = getField('twitter', 'Twitter');
        const notes = getField('notes', 'Notes');

        // Create contact
        const newContact = await db.insert(contacts).values({
          userId: user.id,
          email: emailLower,
          firstName: firstName || null,
          lastName: lastName || null,
          fullName: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null,
          displayName: firstName || emailLower.split('@')[0],
          phone: phone || null,
          company: company || null,
          jobTitle: jobTitle || null,
          location: location || null,
          website: website || null,
          linkedinUrl: linkedin || null,
          twitterHandle: twitter || null,
          notes: notes || null,
          tags: tagsList,
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

