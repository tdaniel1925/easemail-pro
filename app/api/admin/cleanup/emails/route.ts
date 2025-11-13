/**
 * Admin API: Cleanup Placeholder Emails
 * Removes placeholder/invalid emails from contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts, users } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

// Common placeholder email patterns
const PLACEHOLDER_PATTERNS = [
  'noemail@',
  'noreply@',
  'no-reply@',
  'donotreply@',
  'do-not-reply@',
  'example.com',
  'test@',
  'placeholder@',
  'temp@',
  'temporary@',
  'dummy@',
  'fake@',
  '@example',
  '@placeholder',
  '@temp',
  '@test',
];

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate and check admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    console.log('🧹 Starting placeholder email cleanup (admin)...');

    // Get all contacts
    const allContacts = await db.select().from(contacts);

    let updatedCount = 0;
    let deletedCount = 0;

    for (const contact of allContacts) {
      if (!contact.email) {
        continue;
      }

      const emailLower = contact.email.toLowerCase();

      // Check if email matches any placeholder pattern
      const isPlaceholder = PLACEHOLDER_PATTERNS.some(pattern =>
        emailLower.includes(pattern.toLowerCase())
      );

      if (isPlaceholder) {
        // If contact has a phone number, keep the contact but remove the email
        if (contact.phone) {
          await db.update(contacts)
            .set({ email: sql`NULL` })
            .where(sql`id = ${contact.id}`);

          updatedCount++;
        } else {
          // No phone number, delete the entire contact
          await db.delete(contacts)
            .where(sql`id = ${contact.id}`);

          deletedCount++;
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log('✅ Placeholder email cleanup complete!');
    console.log(`   - Emails removed (contacts kept): ${updatedCount}`);
    console.log(`   - Contacts deleted: ${deletedCount}`);

    return NextResponse.json({
      success: true,
      emailsRemoved: updatedCount,
      contactsDeleted: deletedCount,
      totalContacts: allContacts.length,
      duration,
    });
  } catch (error) {
    console.error('❌ Placeholder email cleanup failed:', error);

    return NextResponse.json({
      success: false,
      error: 'Email cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}
