/**
 * Admin API: Cleanup Placeholder Emails
 * Removes placeholder/invalid emails from contacts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { contacts, users } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

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

export const POST = withCsrfProtection(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    // Authenticate and check admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized email cleanup attempt');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted email cleanup', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    logger.admin.info('Starting placeholder email cleanup', {
      triggeredBy: dbUser.email
    });

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

    logger.admin.info('Placeholder email cleanup complete', {
      triggeredBy: dbUser.email,
      emailsRemoved: updatedCount,
      contactsDeleted: deletedCount,
      totalContacts: allContacts.length,
      durationMs: duration
    });

    return successResponse({
      emailsRemoved: updatedCount,
      contactsDeleted: deletedCount,
      totalContacts: allContacts.length,
      duration
    }, 'Email cleanup completed successfully');
  } catch (error) {
    logger.api.error('Email cleanup failed', error);
    return internalError();
  }
});
