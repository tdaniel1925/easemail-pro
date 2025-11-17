import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/learn-style
 * Analyzes the user's writing style from their last 50 sent emails
 * and stores a style profile for personalized AI email generation
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // 1. Get the user's email account
    const { data: account } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', session.user.id)
      .single();

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // 2. Fetch last 50 sent emails from Nylas
    const nylasGrantId = account.nylas_grant_id;

    console.log('[learn-style] Fetching sent emails for account:', account.email_address);

    const sentResponse = await fetch(
      `${process.env.NEXT_PUBLIC_NYLAS_API_URI}/v3/grants/${nylasGrantId}/messages?limit=50&search_query_native=in:sent`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!sentResponse.ok) {
      console.error('[learn-style] Failed to fetch sent emails:', await sentResponse.text());
      return NextResponse.json({ error: 'Failed to fetch sent emails' }, { status: 500 });
    }

    const { data: sentMessages } = await sentResponse.json();

    if (!sentMessages || sentMessages.length === 0) {
      return NextResponse.json({
        error: 'No sent emails found to analyze',
        success: false
      }, { status: 400 });
    }

    console.log('[learn-style] Found', sentMessages.length, 'sent emails');

    // 3. Extract email bodies for analysis
    const emailTexts = sentMessages
      .filter((msg: any) => msg.body)
      .map((msg: any) => {
        // Get plain text or strip HTML
        const body = msg.body;
        // Simple HTML stripping (you might want to use a library for this)
        const plainText = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return plainText;
      })
      .filter((text: string) => text.length > 50) // Only meaningful emails
      .slice(0, 50); // Limit to 50 emails

    if (emailTexts.length === 0) {
      return NextResponse.json({
        error: 'No valid email content found to analyze',
        success: false
      }, { status: 400 });
    }

    console.log('[learn-style] Analyzing', emailTexts.length, 'emails with OpenAI');

    // 4. Use OpenAI to analyze writing style
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const analysisPrompt = `You are a writing style analyst. I will provide you with ${emailTexts.length} email samples from a user. Analyze their unique writing style and create a detailed style profile that can be used to generate new emails that sound like them.

Focus on:
1. **Tone**: Formal, casual, friendly, professional, enthusiastic, reserved, etc.
2. **Vocabulary**: Common words/phrases they use, technical terms, colloquialisms
3. **Sentence Structure**: Short vs long sentences, simple vs complex, use of lists/bullets
4. **Greetings**: How they typically start emails ("Hi", "Hello", "Hey", "Dear", etc.)
5. **Closings**: How they sign off ("Best", "Thanks", "Cheers", "Regards", etc.)
6. **Punctuation**: Use of exclamation marks, emojis, ellipses, em-dashes, etc.
7. **Paragraph Style**: Short paragraphs, long blocks of text, use of spacing
8. **Personal Quirks**: Any unique phrases, expressions, or patterns they use

Provide a comprehensive style profile in 2-3 paragraphs that can be used as instructions for generating emails in their voice.

Here are the email samples:

${emailTexts.map((text, i) => `--- Email ${i + 1} ---\n${text}\n`).join('\n')}

Style Profile:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing writing styles and creating detailed style profiles for personalized communication.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const styleProfile = completion.choices[0].message.content;

    if (!styleProfile) {
      return NextResponse.json({ error: 'Failed to generate style profile' }, { status: 500 });
    }

    console.log('[learn-style] Generated style profile');

    // 5. Store the style profile in user preferences
    const { data: existingPref } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (existingPref) {
      // Update existing preferences
      await supabase
        .from('user_preferences')
        .update({
          email_writing_style: styleProfile,
          email_style_learned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', session.user.id);
    } else {
      // Create new preferences
      await supabase
        .from('user_preferences')
        .insert({
          user_id: session.user.id,
          email_writing_style: styleProfile,
          email_style_learned_at: new Date().toISOString(),
          use_personal_style: true,
        });
    }

    console.log('[learn-style] ✅ Style profile saved successfully');

    return NextResponse.json({
      success: true,
      message: 'Writing style learned successfully',
      styleProfile,
      emailsAnalyzed: emailTexts.length,
    });

  } catch (error) {
    console.error('[learn-style] Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze writing style' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/learn-style
 * Get the current writing style profile for the user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('email_writing_style, email_style_learned_at, use_personal_style')
      .eq('user_id', session.user.id)
      .single();

    if (!preferences || !preferences.email_writing_style) {
      return NextResponse.json({
        success: true,
        hasStyle: false,
        styleProfile: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasStyle: true,
      styleProfile: preferences.email_writing_style,
      learnedAt: preferences.email_style_learned_at,
      usePersonalStyle: preferences.use_personal_style ?? true,
    });

  } catch (error) {
    console.error('[learn-style] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch writing style' },
      { status: 500 }
    );
  }
}
