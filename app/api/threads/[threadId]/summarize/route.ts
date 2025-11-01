import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ThreadingService } from '@/lib/email/threading-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/threads/[threadId]/summarize
 * Generate or regenerate AI summary for a thread
 */
export async function POST(
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

    // Get thread to verify ownership
    const thread = await ThreadingService.getThreadDetails(threadId);

    if (!thread) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }

    if (thread.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Generate summary
    await ThreadingService.generateThreadSummary(threadId);

    // Get updated thread
    const updatedThread = await ThreadingService.getThreadDetails(threadId);

    return NextResponse.json({
      success: true,
      summary: updatedThread?.aiSummary || null,
      thread: updatedThread,
    });
  } catch (error) {
    console.error('Error generating thread summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate thread summary' },
      { status: 500 }
    );
  }
}

