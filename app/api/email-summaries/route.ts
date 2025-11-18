/**
 * API endpoint for AI-powered email summaries
 * Generates and caches intelligent summaries of email content
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, accountId, emailContent, subject } = await request.json();

    if (!messageId || !accountId || !emailContent) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, accountId, emailContent' },
        { status: 400 }
      );
    }

    // Check if summary already exists
    const { data: existingSummary } = await supabase
      .from('email_summaries')
      .select('*')
      .eq('message_id', messageId)
      .eq('account_id', accountId)
      .single();

    if (existingSummary) {
      return NextResponse.json({
        success: true,
        summary: existingSummary.summary,
        cached: true,
      });
    }

    // Generate AI summary using OpenAI
    const prompt = `You are an email assistant. Summarize the following email in 1-2 concise sentences (max 150 characters). Focus on the key action items or main points.

Subject: ${subject || 'No subject'}

Email content:
${emailContent.substring(0, 2000)}

Provide only the summary, no additional text or formatting.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that creates concise email summaries. Keep summaries under 150 characters and focus on actionable information.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const summary = completion.choices[0]?.message?.content?.trim();

    if (!summary) {
      return NextResponse.json(
        { error: 'Failed to generate summary' },
        { status: 500 }
      );
    }

    // Store summary in database
    const { error: insertError } = await supabase
      .from('email_summaries')
      .insert({
        message_id: messageId,
        account_id: accountId,
        summary,
      });

    if (insertError) {
      console.error('Error storing summary:', insertError);
      // Still return the summary even if storage fails
    }

    return NextResponse.json({
      success: true,
      summary,
      cached: false,
    });
  } catch (error) {
    console.error('Error generating email summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch existing summaries for multiple emails
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageIds = searchParams.get('messageIds')?.split(',') || [];
    const accountId = searchParams.get('accountId');

    if (!accountId || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing accountId or messageIds' },
        { status: 400 }
      );
    }

    const { data: summaries, error } = await supabase
      .from('email_summaries')
      .select('*')
      .eq('account_id', accountId)
      .in('message_id', messageIds);

    if (error) {
      throw error;
    }

    // Create a map of messageId -> summary for easy lookup
    const summaryMap: Record<string, string> = {};
    summaries?.forEach((s) => {
      summaryMap[s.message_id] = s.summary;
    });

    return NextResponse.json({
      success: true,
      summaries: summaryMap,
    });
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summaries' },
      { status: 500 }
    );
  }
}
