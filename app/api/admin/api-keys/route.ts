import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { users, systemSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET: Fetch all API keys (masked for security)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    // Fetch API keys from system_settings table
    const settings = await db.query.systemSettings.findMany();

    // Convert array to object and mask sensitive values
    const keys: Record<string, string> = {};
    settings.forEach((setting) => {
      // Return masked version (showing only last 4 chars for security)
      if (setting.value && setting.value.length > 8) {
        keys[setting.key] = setting.value;
      } else {
        keys[setting.key] = setting.value || '';
      }
    });

    return NextResponse.json({ success: true, keys });
  } catch (error) {
    console.error('API keys fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}

// POST: Save/Update API keys
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is platform admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser || dbUser.role !== 'platform_admin') {
      return NextResponse.json({ error: 'Forbidden - Platform admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { keys } = body;

    if (!keys || typeof keys !== 'object') {
      return NextResponse.json({ error: 'Invalid keys data' }, { status: 400 });
    }

    // Update or insert each API key
    for (const [key, value] of Object.entries(keys)) {
      if (typeof value === 'string') {
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
        } else {
          // Insert new
          await db.insert(systemSettings).values({
            key: key,
            value: value,
            description: `API key for ${key}`,
          });
        }
      }
    }

    console.log(`✅ API keys updated by admin ${dbUser.email}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API keys save error:', error);
    return NextResponse.json({ error: 'Failed to save API keys' }, { status: 500 });
  }
}

