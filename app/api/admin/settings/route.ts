import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { withCsrfProtection } from '@/lib/security/csrf';
import { successResponse, unauthorized, forbidden, badRequest, internalError } from '@/lib/api/error-response';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

// Allowed setting keys to prevent arbitrary settings injection
const ALLOWED_SETTING_KEYS = new Set([
  'siteName',
  'siteUrl',
  'supportEmail',
  'allowSignups',
  'requireEmailVerification',
  'enableSMS',
  'enableAI',
  'maxAttachmentSize',
  'sessionTimeout',
  'maintenanceMode',
  'smtpHost',
  'smtpPort',
  'smtpUser',
  'smtpSecure',
  'twilioEnabled',
  'stripeEnabled',
  'openaiModel',
  'maxEmailsPerSync',
  'syncIntervalMinutes',
]);

// Maximum value length to prevent memory exhaustion
const MAX_VALUE_LENGTH = 10000;

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized system settings access');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to access system settings', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    // Fetch system settings
    const settings = await db.query.systemSettings.findMany();

    // Convert settings array to object
    const settingsObject: Record<string, any> = {
      siteName: 'EaseMail',
      siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
      supportEmail: 'support@easemail.com',
      allowSignups: true,
      requireEmailVerification: false,
      enableSMS: false,
      enableAI: true,
      maxAttachmentSize: 25,
      sessionTimeout: 30,
    };

    settings.forEach((setting) => {
      const value = setting.value;

      // Skip null values
      if (value === null) {
        settingsObject[setting.key] = null;
        return;
      }

      // Try to parse JSON values
      try {
        settingsObject[setting.key] = JSON.parse(value);
      } catch (parseError) {
        // Value is not valid JSON, use as plain string
        settingsObject[setting.key] = value;
      }
    });

    logger.admin.info('System settings fetched', {
      requestedBy: dbUser.email,
      settingCount: settings.length
    });

    return successResponse({ settings: settingsObject });
  } catch (error) {
    logger.api.error('Failed to fetch system settings', error);
    return internalError();
  }
}

export const POST = withCsrfProtection(async (request: NextRequest) => {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      logger.admin.warn('Unauthorized system settings update attempt');
      return unauthorized();
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      logger.security.warn('Non-admin attempted to update system settings', {
        userId: user.id,
        email: user.email,
        role: dbUser?.role,
      });
      return forbidden('Platform admin access required');
    }

    const body = await request.json();
    const { settings: settingsToSave } = body;

    if (!settingsToSave || typeof settingsToSave !== 'object') {
      logger.admin.warn('Invalid settings object provided', { requestedBy: dbUser.email });
      return badRequest('Settings object required');
    }

    // Validate and save each setting to the database
    const invalidKeys: string[] = [];
    const savedKeys: string[] = [];

    for (const [key, value] of Object.entries(settingsToSave)) {
      // Validate setting key is allowed
      if (!ALLOWED_SETTING_KEYS.has(key)) {
        invalidKeys.push(key);
        continue;
      }

      // Convert value to string
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

      // Validate value length to prevent memory exhaustion
      if (stringValue.length > MAX_VALUE_LENGTH) {
        logger.admin.warn('Setting value exceeds max length', {
          key,
          length: stringValue.length,
          maxLength: MAX_VALUE_LENGTH,
          requestedBy: dbUser.email
        });
        return badRequest(`Value for '${key}' exceeds maximum length of ${MAX_VALUE_LENGTH} characters`);
      }

      await db
        .insert(systemSettings)
        .values({
          key,
          value: stringValue,
        })
        .onConflictDoUpdate({
          target: systemSettings.key,
          set: {
            value: stringValue,
            updatedAt: new Date(),
          },
        });

      savedKeys.push(key);
    }

    // Log if there were invalid keys (but still succeed for valid ones)
    if (invalidKeys.length > 0) {
      logger.admin.warn('Ignored invalid setting keys', {
        invalidKeys,
        requestedBy: dbUser.email
      });
    }

    logger.admin.info('System settings updated', {
      savedKeys,
      invalidKeys,
      updatedBy: dbUser.email
    });

    return successResponse({
      saved: savedKeys,
      ...(invalidKeys.length > 0 ? { ignoredKeys: invalidKeys } : {}),
    }, 'System settings updated successfully');
  } catch (error) {
    logger.api.error('Failed to save system settings', error);
    return internalError();
  }
});

