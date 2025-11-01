import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { billingSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePlatformAdmin } from '@/lib/auth/permissions';

// GET /api/admin/pricing/settings - Get all billing settings
export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const settings = await db.select().from(billingSettings).orderBy(billingSettings.settingKey);

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Error fetching billing settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch billing settings' },
      { status: error.message?.includes('Unauthorized') ? 403 : 500 }
    );
  }
}

// PATCH /api/admin/pricing/settings - Update billing settings (bulk)
export async function PATCH(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const body = await request.json();
    const { settings: settingsToUpdate } = body;

    if (!settingsToUpdate || !Array.isArray(settingsToUpdate)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
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

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('Error updating billing settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update billing settings' },
      { status: 500 }
    );
  }
}

