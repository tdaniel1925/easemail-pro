import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ThreadingService } from '@/lib/email/threading-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/threads/[threadId]
 * Get thread details with emails, participants, timeline, and AI summary
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = params;

    // Get thread details
    const thread = await ThreadingService.getThreadDetails(threadId);

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    // Verify ownership
    if (thread.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      thread,
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thread' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/threads/[threadId]
 * Update thread metadata (mute, archive, mark as read, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { threadId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { threadId } = params;
    const body = await request.json();

    const { action, value } = body;

    // Get thread to verify ownership
    const thread = await ThreadingService.getThreadDetails(threadId);

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Import db and emailThreads here to avoid circular deps
    const { db } = await import('@/lib/db/drizzle');
    const { emailThreads, emails } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    // Handle different actions
    switch (action) {
      case 'mute':
        await db.update(emailThreads)
          .set({ isMuted: value, updatedAt: new Date() })
          .where(eq(emailThreads.id, threadId));
        break;

      case 'archive':
        await db.update(emailThreads)
          .set({ isArchived: value, updatedAt: new Date() })
          .where(eq(emailThreads.id, threadId));
        
        // Also archive all emails in thread
        await db.update(emails)
          .set({ isArchived: value, updatedAt: new Date() })
          .where(eq(emails.threadId, threadId));
        break;

      case 'star':
        await db.update(emailThreads)
          .set({ isStarred: value, updatedAt: new Date() })
          .where(eq(emailThreads.id, threadId));
        break;

      case 'mark_read':
        await db.update(emailThreads)
          .set({ isRead: value, hasUnread: !value, updatedAt: new Date() })
          .where(eq(emailThreads.id, threadId));
        
        // Also mark all emails in thread
        await db.update(emails)
          .set({ isRead: value, updatedAt: new Date() })
          .where(eq(emails.threadId, threadId));
        break;

      case 'complete_action':
        // Complete an action item
        const { actionIndex } = body;
        if (thread.actionItems && thread.actionItems[actionIndex]) {
          const updatedActions = [...thread.actionItems];
          updatedActions[actionIndex].status = 'completed';
          
          await db.update(emailThreads)
            .set({ actionItems: updatedActions, updatedAt: new Date() })
            .where(eq(emailThreads.id, threadId));
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Thread updated successfully',
    });
  } catch (error) {
    console.error('Error updating thread:', error);
    return NextResponse.json(
      { error: 'Failed to update thread' },
      { status: 500 }
    );
  }
}

