/**
 * Admin API: Cleanup Default Tags
 * Removes default/unwanted tags from all contacts
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

// List of tags to remove
const TAGS_TO_REMOVE = [
  'Contacts',
  'My Contacts',
  'Starred',
  'Other Contacts',
  'Default',
  'All Contacts',
];

export const POST = withCsrfProtection(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    // Authenticate and check admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized tag cleanup attempt');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted tag cleanup', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    logger.admin.info('Starting tag cleanup', {
      triggeredBy: dbUser.email
    });

    // Get all contacts with tags
    const allContacts = await db.select().from(contacts);

    let updatedCount = 0;
    let totalTagsRemoved = 0;

    for (const contact of allContacts) {
      if (!contact.tags || contact.tags.length === 0) {
        continue;
      }

      // Filter out unwanted tags
      const originalTagsCount = contact.tags.length;
      const cleanedTags = contact.tags.filter(
        (tag: string) => !TAGS_TO_REMOVE.some(
          unwanted => tag.toLowerCase() === unwanted.toLowerCase()
        )
      );

      // Update if tags were removed
      if (cleanedTags.length < originalTagsCount) {
        await db.update(contacts)
          .set({ tags: cleanedTags })
          .where(sql`id = ${contact.id}`);

        const removedCount = originalTagsCount - cleanedTags.length;
        totalTagsRemoved += removedCount;
        updatedCount++;
      }
    }

    const duration = Date.now() - startTime;

    logger.admin.info('Tag cleanup complete', {
      triggeredBy: dbUser.email,
      contactsUpdated: updatedCount,
      tagsRemoved: totalTagsRemoved,
      totalContacts: allContacts.length,
      durationMs: duration
    });

    return successResponse({
      contactsUpdated: updatedCount,
      tagsRemoved: totalTagsRemoved,
      totalContacts: allContacts.length,
      duration
    }, 'Tag cleanup completed successfully');
  } catch (error) {
    logger.api.error('Tag cleanup failed', error);
    return internalError();
  }
});
