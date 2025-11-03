import { NextRequest, NextResponse } from 'next/server';
import { polishDictation } from '@/lib/ai/dictation-polish';
import { createClient } from '@/lib/supabase/server';
import { trackAIUsage } from '@/lib/usage/ai-tracker';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text, recipientName } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Polish the dictation
    const result = await polishDictation({
      text,
      recipientName,
      tone: 'professional',
    });

    // Track AI usage
    await trackAIUsage({
      userId: user.id,
      feature: 'dictation',
      requestCount: 1,
    });

    return NextResponse.json({
      success: true,
      subject: result.subject,
      polishedText: result.body,
    });
  } catch (error: any) {
    console.error('Dictation polish API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to polish dictation' },
      { status: 500 }
    );
  }
}

