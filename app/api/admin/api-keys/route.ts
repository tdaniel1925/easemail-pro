import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { successResponse, unauthorized, forbidden, internalError, badRequest } from '@/lib/api/error-response';

export const dynamic = 'force-dynamic';

/**
 * Mask API key for secure display
 * Shows first 4 and last 4 characters, masks the middle
 */
function maskApiKey(key: string): string {
  if (!key || key.length < 8) {
    return '••••••••'; // If too short, fully mask
  }

  const visibleChars = 4;
  const start = key.substring(0, visibleChars);
  const end = key.substring(key.length - visibleChars);
  const maskedLength = key.length - (visibleChars * 2);
  const masked = '•'.repeat(Math.max(maskedLength, 8)); // At least 8 dots

  return `${start}${masked}${end}`;
}

// GET: Fetch all API keys (masked for security)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.security.warn('Unauthorized API key access attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to access API keys', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    // Fetch API keys from system_settings table
    const settings = await db.query.systemSettings.findMany();

    // Convert array to object and mask sensitive values
    const keys: Record<string, string> = {};
    settings.forEach((setting) => {
      // ✅ SECURITY FIX: Always mask API keys before returning
      keys[setting.key] = maskApiKey(setting.value || '');
    });

    logger.admin.info('API keys fetched (masked)', {
      adminEmail: dbUser.email,
      keyCount: settings.length,
    });

    return successResponse({ keys });
  } catch (error) {
    logger.api.error('API keys fetch error', error);
    return internalError();
  }
}

// POST: Save/Update API keys
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.security.warn('Unauthorized API key update attempt');
      return unauthorized();
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to update API keys', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { keys } = body;

    if (!keys || typeof keys !== 'object') {
      logger.admin.warn('Invalid API keys data submitted', { adminEmail: dbUser.email });
      return badRequest('Invalid keys data');
    }

    const updatedKeys: string[] = [];
    const newKeys: string[] = [];

    // Update or insert each API key
    for (const [key, value] of Object.entries(keys)) {
      if (typeof value === 'string' && value.trim()) {
        // Check if setting exists
        const existing = await db.query.systemSettings.findFirst({
          where: eq(systemSettings.key, key),
        });

        if (existing) {
          // Update existing
          await db.update(systemSettings)
            .set({
              value: value,
              updatedAt: new Date(),
            })
            .where(eq(systemSettings.key, key));
          updatedKeys.push(key);
        } else {
          // Insert new
          await db.insert(systemSettings).values({
            key: key,
            value: value,
            description: `API key for ${key}`,
          });
          newKeys.push(key);
        }
      }
    }

    logger.security.info('API keys updated by admin', {
      adminEmail: dbUser.email,
      adminId: dbUser.id,
      updatedKeys,
      newKeys,
      totalKeys: updatedKeys.length + newKeys.length,
    });

    return successResponse(
      { updatedCount: updatedKeys.length, newCount: newKeys.length },
      'API keys updated successfully'
    );
  } catch (error) {
    logger.api.error('API keys save error', error);
    return internalError();
  }
}

