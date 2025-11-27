import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    return NextResponse.json({ success: true, settings: settingsObject });
  } catch (error) {
    console.error('Failed to fetch system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { settings: settingsToSave } = body;

    if (!settingsToSave || typeof settingsToSave !== 'object') {
      return NextResponse.json({ error: 'Settings object required' }, { status: 400 });
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
        return NextResponse.json(
          { error: `Value for '${key}' exceeds maximum length of ${MAX_VALUE_LENGTH} characters` },
          { status: 400 }
        );
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
      console.warn(`[Admin Settings] Ignored invalid setting keys: ${invalidKeys.join(', ')}`);
    }

    return NextResponse.json({
      success: true,
      saved: savedKeys,
      ...(invalidKeys.length > 0 ? { ignoredKeys: invalidKeys } : {}),
    });
  } catch (error) {
    console.error('Failed to save system settings:', error);
    return NextResponse.json(
      { error: 'Failed to save system settings' },
      { status: 500 }
    );
  }
}

