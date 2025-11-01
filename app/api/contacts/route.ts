import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    console.log('📝 Creating contact:', data.email);

    const newContact = await db.insert(contacts).values({
      userId: user.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone || null,
      company: data.company || null,
      jobTitle: data.jobTitle || null,
      website: data.website || null,
      linkedinUrl: data.linkedIn || null,
      twitterHandle: data.twitter || null,
      location: data.address || null,
      notes: data.notes || null,
    }).returning();

    console.log('✅ Contact created:', newContact[0].id);

    return NextResponse.json({
      success: true,
      contact: newContact[0],
    });
  } catch (error: any) {
    console.error('❌ Contact creation error:', error);
    
    // Check for duplicate email error
    if (error?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Contact with this email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for email query parameter (for ContactPanel lookup)
    const { searchParams } = new URL(request.url);
    const emailQuery = searchParams.get('email');

    if (emailQuery) {
      // Query by specific email
      const contact = await db.query.contacts.findMany({
        where: and(
          eq(contacts.userId, user.id),
          eq(contacts.email, emailQuery)
        ),
      });

      return NextResponse.json({
        success: true,
        contacts: contact,
      });
    }

    // Get all contacts
    const allContacts = await db.query.contacts.findMany({
      where: eq(contacts.userId, user.id),
      orderBy: (contacts, { desc }) => [desc(contacts.createdAt)],
    });

    return NextResponse.json({
      success: true,
      contacts: allContacts,
    });
  } catch (error) {
    console.error('❌ Contacts fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

