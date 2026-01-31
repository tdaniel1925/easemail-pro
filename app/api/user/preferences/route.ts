/**
 * Update User Preferences
 * PATCH /api/user/preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db/drizzle';
import { userPreferences, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Validation schema for user preferences
const userPreferencesSchema = z.object({
  // Appearance
  theme: z.enum(['light', 'dark']).optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  dateFormat: z.string().max(20).optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),

  // Email display
  emailDensity: z.enum(['comfortable', 'compact', 'spacious']).optional(),
  emailsPerPage: z.number().int().min(10).max(100).optional(),
  showAvatars: z.boolean().optional(),
  showSnippets: z.boolean().optional(),
  showAISummaries: z.boolean().optional(),

  // Reading
  autoAdvance: z.boolean().optional(),
  conversationView: z.boolean().optional(),
  showImages: z.boolean().optional(),
  markAsReadOnView: z.boolean().optional(),

  // Composing
  smartCompose: z.boolean().optional(),
  defaultReplyBehavior: z.enum(['reply', 'reply-all', 'forward']).optional(),
  autoSaveDrafts: z.boolean().optional(),
  hideSignaturePrompt: z.boolean().optional(),

  // Notifications
  notificationsEnabled: z.boolean().optional(),
  desktopNotifications: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  showNotificationPreview: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(), // HH:MM format

  // AI Features
  aiEnabled: z.boolean().optional(),
  aiAutoSummarize: z.boolean().optional(),
  aiAttachmentProcessing: z.boolean().optional(),

  // Writing Style Learning
  emailWritingStyle: z.string().optional(),
  emailStyleLearnedAt: z.date().optional(),
  usePersonalStyle: z.boolean().optional(),

  // Feature Flags
  useEmailRendererV3: z.boolean().optional(),
}).strict(); // Reject any fields not in schema

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validationResult = userPreferencesSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid preferences data',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

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
      // Update existing preferences with validated data
      await db.update(userPreferences)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, dbUser.id));
    } else {
      // Create new preferences with validated data
      await db.insert(userPreferences).values({
        userId: dbUser.id,
        ...validatedData,
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
      console.error('User not found in database:', user.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get preferences (or return defaults if none exist)
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, dbUser.id),
    });

    // If no preferences exist, return defaults
    if (!prefs) {
      console.log('No preferences found for user, returning defaults');
      return NextResponse.json({ 
        success: true, 
        preferences: null // Frontend will use defaults
      });
    }

    return NextResponse.json({ success: true, preferences: prefs });
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Failed to fetch preferences', details: error.message },
      { status: 500 }
    );
  }
}
