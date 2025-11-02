import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, params.contactId),
        eq(contacts.userId, user.id)
      ),
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      contact,
    });
  } catch (error) {
    console.error('❌ Contact fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Get the existing contact to check current values
    const existingContact = await db.query.contacts.findFirst({
      where: and(
        eq(contacts.id, params.contactId),
        eq(contacts.userId, user.id)
      ),
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Determine final values after update
    const finalFirstName = data.firstName !== undefined ? data.firstName : existingContact.firstName;
    const finalLastName = data.lastName !== undefined ? data.lastName : existingContact.lastName;
    const finalEmail = data.email !== undefined ? data.email : existingContact.email;
    const finalPhone = data.phone !== undefined ? data.phone : existingContact.phone;

    // Flexible validation: Need at least first OR last name
    const hasName = (finalFirstName && finalFirstName.trim()) || (finalLastName && finalLastName.trim());
    
    // Flexible validation: Need at least email OR phone
    const hasContact = (finalEmail && finalEmail.trim()) || (finalPhone && finalPhone.trim());

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

    console.log('📝 Updating contact:', params.contactId);

    // Build fullName and displayName with proper fallbacks
    const updatedFirstName = data.firstName !== undefined ? data.firstName : finalFirstName;
    const updatedLastName = data.lastName !== undefined ? data.lastName : finalLastName;
    const updatedEmail = data.email !== undefined ? data.email : finalEmail;
    const updatedPhone = data.phone !== undefined ? data.phone : finalPhone;

    const fullName = updatedFirstName && updatedLastName 
      ? `${updatedFirstName} ${updatedLastName}` 
      : updatedFirstName || updatedLastName || '';
    
    const displayName = updatedFirstName || 
                       updatedLastName || 
                       (updatedEmail ? updatedEmail.split('@')[0] : null) || 
                       (updatedPhone ? updatedPhone : 'Unknown');

    const updatedContact = await db
      .update(contacts)
      .set({
        email: data.email !== undefined ? data.email || null : undefined,
        firstName: data.firstName !== undefined ? data.firstName || null : undefined,
        lastName: data.lastName !== undefined ? data.lastName || null : undefined,
        fullName,
        displayName,
        phone: data.phone !== undefined ? data.phone || null : undefined,
        company: data.company !== undefined ? data.company || null : undefined,
        jobTitle: data.jobTitle !== undefined ? data.jobTitle || null : undefined,
        department: data.department !== undefined ? data.department || null : undefined,
        website: data.website !== undefined ? data.website || null : undefined,
        linkedinUrl: data.linkedIn !== undefined ? data.linkedIn || null : undefined,
        twitterHandle: data.twitter !== undefined ? data.twitter || null : undefined,
        location: data.address !== undefined ? data.address || null : undefined,
        notes: data.notes !== undefined ? data.notes || null : undefined,
        tags: data.tags !== undefined ? data.tags || [] : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contacts.id, params.contactId),
          eq(contacts.userId, user.id)
        )
      )
      .returning();

    if (!updatedContact.length) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    console.log('✅ Contact updated:', updatedContact[0].id);

    return NextResponse.json({
      success: true,
      contact: updatedContact[0],
    });
  } catch (error: any) {
    console.error('❌ Contact update error:', error);
    
    if (error?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Contact with this email already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🗑️ Deleting contact:', params.contactId);

    const deletedContact = await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.id, params.contactId),
          eq(contacts.userId, user.id)
        )
      )
      .returning();

    if (!deletedContact.length) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    console.log('✅ Contact deleted:', params.contactId);

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    console.error('❌ Contact deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}

