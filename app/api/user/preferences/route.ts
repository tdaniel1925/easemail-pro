/**
 * User Preferences API
 * GET/PUT /api/user/preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { userPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function GET(request: NextRequest) {
  try {
    const userId = TEST_USER_ID; // In production, get from session

    let prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    // Create default preferences if not found
    if (!prefs) {
      const [newPrefs] = await db.insert(userPreferences).values({
        userId,
        aiAttachmentProcessing: false, // Default OFF
      }).returning();
      prefs = newPrefs;
    }

    return NextResponse.json(prefs);
  } catch (error: any) {
    console.error('Get preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get preferences', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = TEST_USER_ID; // In production, get from session
    const body = await request.json();

    // Update preferences
    const [updated] = await db
      .update(userPreferences)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, userId))
      .returning();

    // If no rows updated, create new
    if (!updated) {
      const [newPrefs] = await db.insert(userPreferences).values({
        userId,
        ...body,
      }).returning();
      return NextResponse.json(newPrefs);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error.message },
      { status: 500 }
    );
  }
}

