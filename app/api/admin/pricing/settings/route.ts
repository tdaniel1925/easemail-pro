import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { billingSettings, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/pricing/settings
 * Get all billing settings
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized billing settings access');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to access billing settings', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const settings = await db.select().from(billingSettings).orderBy(billingSettings.settingKey);

    logger.admin.info('Billing settings fetched', {
      requestedBy: dbUser.email,
      settingsCount: settings.length
    });

    return successResponse({ settings });
  } catch (error: any) {
    logger.api.error('Error fetching billing settings', error);
    return internalError();
  }
}

/**
 * PATCH /api/admin/pricing/settings
 * Update billing settings (bulk) (CSRF Protected)
 */
export const PATCH = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized billing settings update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-platform-admin attempted to update billing settings', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { settings: settingsToUpdate } = body;

    if (!settingsToUpdate || !Array.isArray(settingsToUpdate)) {
      logger.admin.warn('Invalid billing settings update format', {
        requestedBy: dbUser.email,
        isArray: Array.isArray(settingsToUpdate)
      });
      return badRequest('settings must be an array');
    }

    // Update each setting
    const results = await Promise.all(
      settingsToUpdate.map(async (setting: { settingKey: string; settingValue: string }) => {
        const [updated] = await db
          .update(billingSettings)
          .set({
            settingValue: setting.settingValue,
            updatedAt: new Date(),
          })
          .where(eq(billingSettings.settingKey, setting.settingKey))
          .returning();
        return updated;
      })
    );

    const updatedKeys = settingsToUpdate.map((s: any) => s.settingKey);

    logger.admin.info('Billing settings updated', {
      updatedBy: dbUser.email,
      settingsCount: results.length,
      settingKeys: updatedKeys
    });

    return successResponse({ settings: results }, 'Billing settings updated successfully');
  } catch (error: any) {
    logger.api.error('Error updating billing settings', error);
    return internalError();
  }
});

