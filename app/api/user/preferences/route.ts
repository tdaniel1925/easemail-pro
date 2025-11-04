/**
 * Update User Preferences
 * PATCH /api/user/preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { userPreferences, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if preferences exist
    const existingPrefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, dbUser.id),
    });

    if (existingPrefs) {
      // Update existing preferences
      await db.update(userPreferences)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, dbUser.id));
    } else {
      // Create new preferences
      await db.insert(userPreferences).values({
        userId: dbUser.id,
        ...body,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get preferences
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, dbUser.id),
    });

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}
