import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq, and, or, ilike } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Flexible validation: Need at least first OR last name
    const hasName = (data.firstName && data.firstName.trim()) || (data.lastName && data.lastName.trim());
    
    // Flexible validation: Need at least email OR phone
    const hasContact = (data.email && data.email.trim()) || (data.phone && data.phone.trim());

    const missing = [];
    if (!hasName) {
      missing.push('a first name or last name');
    }
    if (!hasContact) {
      missing.push('an email or phone number');
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Please provide ${missing.join(' and ')} to save this contact.` },
        { status: 400 }
      );
    }

    console.log('📝 Creating contact:', data.email || data.phone);

    // Build fullName and displayName with proper fallbacks
    const fullName = data.firstName && data.lastName 
      ? `${data.firstName} ${data.lastName}` 
      : data.firstName || data.lastName || '';
    
    const displayName = data.firstName || 
                       data.lastName || 
                       (data.email ? data.email.split('@')[0] : null) || 
                       (data.phone ? data.phone : 'Unknown');

    const newContact = await db.insert(contacts).values({
      userId: user.id,
      email: data.email || null,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      fullName,
      displayName,
      phone: data.phone || null,
      company: data.company || null,
      jobTitle: data.jobTitle || null,
      department: data.department || null,
      website: data.website || null,
      linkedinUrl: data.linkedIn || null,
      twitterHandle: data.twitter || null,
      location: data.address || null,
      notes: data.notes || null,
      tags: data.tags || [],
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

    // Check for query parameters
    const { searchParams } = new URL(request.url);
    const emailQuery = searchParams.get('email');
    const searchQuery = searchParams.get('search');

    if (emailQuery) {
      // Query by specific email (for ContactPanel lookup)
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

    // Build where clause
    let whereClause: any = eq(contacts.userId, user.id);

    if (searchQuery) {
      whereClause = and(
        eq(contacts.userId, user.id),
        or(
          ilike(contacts.email, `%${searchQuery}%`),
          ilike(contacts.firstName, `%${searchQuery}%`),
          ilike(contacts.lastName, `%${searchQuery}%`),
          ilike(contacts.fullName, `%${searchQuery}%`),
          ilike(contacts.company, `%${searchQuery}%`),
          ilike(contacts.jobTitle, `%${searchQuery}%`)
        )
      );
    }

    // Get all contacts
    const allContacts = await db.query.contacts.findMany({
      where: whereClause,
      orderBy: (contacts, { desc }) => [desc(contacts.lastEmailAt), desc(contacts.createdAt)],
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

