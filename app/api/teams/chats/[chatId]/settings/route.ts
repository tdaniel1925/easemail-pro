// Teams Chat Settings API Route (Pin, Mute, Archive)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { teamsChats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { toggleTeamsChatPin, toggleTeamsChatMute } from '@/lib/teams/teams-sync';

export const dynamic = 'force-dynamic';

// PATCH - Update chat settings
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { action, value } = body;

    // Verify chat ownership
    const chat = await db
      .select()
      .from(teamsChats)
      .where(
        and(
          eq(teamsChats.id, chatId),
          eq(teamsChats.userId, user.id)
        )
      )
      .limit(1);

    if (!chat.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    let result;

    switch (action) {
      case 'pin':
        result = await toggleTeamsChatPin(chatId, value === true);
        break;

      case 'mute':
        result = await toggleTeamsChatMute(chatId, value === true);
        break;

      case 'archive':
        // Archive is just a local setting
        await db
          .update(teamsChats)
          .set({ isArchived: value === true, updatedAt: new Date() })
          .where(eq(teamsChats.id, chatId));
        result = { success: true };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating Teams chat settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// GET - Get chat settings
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    const chat = await db
      .select({
        isPinned: teamsChats.isPinned,
        isMuted: teamsChats.isMuted,
        isArchived: teamsChats.isArchived,
      })
      .from(teamsChats)
      .where(
        and(
          eq(teamsChats.id, chatId),
          eq(teamsChats.userId, user.id)
        )
      )
      .limit(1);

    if (!chat.length) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: chat[0],
    });
  } catch (error) {
    console.error('Error fetching Teams chat settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
