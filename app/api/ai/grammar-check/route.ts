import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GrammarSuggestion {
  original: string;
  suggestion: string;
  reason: string;
  type: 'spelling' | 'grammar' | 'style' | 'punctuation';
  position: {
    start: number;
    end: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    // Use GPT-4 for grammar and style checking
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cost-effective for grammar checking
      messages: [
        {
          role: 'system',
          content: `You are a professional writing assistant. Analyze the text for:
1. Spelling errors
2. Grammar mistakes
3. Punctuation issues
4. Style improvements (clarity, conciseness, professional tone)

Return ONLY a JSON array of suggestions. Each suggestion must have:
- original: the problematic text
- suggestion: the corrected version
- reason: brief explanation
- type: "spelling" | "grammar" | "style" | "punctuation"

If the text is perfect, return an empty array [].
Do not include any markdown, explanations, or text outside the JSON array.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({
        success: true,
        suggestions: [],
      });
    }

    // Parse suggestions
    let suggestions: GrammarSuggestion[] = [];

    try {
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanedContent);

      if (Array.isArray(parsed)) {
        // Find position of each suggestion in the original text
        suggestions = parsed.map((s: any) => {
          const start = text.toLowerCase().indexOf(s.original.toLowerCase());
          return {
            original: s.original,
            suggestion: s.suggestion,
            reason: s.reason,
            type: s.type || 'grammar',
            position: {
              start: start >= 0 ? start : 0,
              end: start >= 0 ? start + s.original.length : 0,
            },
          };
        }).filter((s: GrammarSuggestion) => s.position.start >= 0);
      }
    } catch (parseError) {
      console.error('[Grammar Check] Parse error:', parseError);
      console.error('[Grammar Check] Raw content:', content);
    }

    return NextResponse.json({
      success: true,
      suggestions,
      originalText: text,
    });

  } catch (error: any) {
    console.error('[Grammar Check] Error:', error);
    return NextResponse.json(
      {
        error: 'Grammar check failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}
