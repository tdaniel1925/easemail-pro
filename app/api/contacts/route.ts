import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Default test user ID (replace with actual auth)
    const userId = '00000000-0000-0000-0000-000000000000';

    console.log('📝 Creating contact:', data.email);

    const newContact = await db.insert(contacts).values({
      userId,
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
    const userId = '00000000-0000-0000-0000-000000000000';
    
    const allContacts = await db.query.contacts.findMany({
      where: eq(contacts.userId, userId),
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

