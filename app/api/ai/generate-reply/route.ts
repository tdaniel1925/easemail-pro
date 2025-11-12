/**
 * AI Generate Reply API
 * POST /api/ai/generate-reply
 * Generates an AI-powered draft reply to an email
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { trackAICost } from '@/lib/utils/cost-tracking';
import { aiRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { checkAILimit } from '@/lib/billing/plan-limits';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateReplyRequest {
  emailId: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  bodyText: string;
  context?: string; // Optional context for reply
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Check rate limit
    const rateLimitResult = await enforceRateLimit(aiRateLimit, userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    // Check usage limits
    const limitCheck = await checkAILimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Usage limit reached',
          message: limitCheck.message,
          upgradeUrl: limitCheck.upgradeUrl,
          tier: limitCheck.tier,
          used: limitCheck.used,
          limit: limitCheck.limit,
        },
        { status: 429 }
      );
    }

    const { emailId, subject, fromName, fromEmail, bodyText, context }: GenerateReplyRequest = await request.json();

    console.log('🤖 Generating AI reply for email:', emailId);

    // Check if OpenAI key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
      }, { status: 500 });
    }

    // Generate reply using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional email assistant helping to compose replies.

Rules:
- Write a professional but friendly reply
- Be concise and to the point
- Match the tone of the original email
- Address all key points from the original email
- Keep it natural and conversational
- DO NOT include subject line or email headers
- DO NOT include signature (that will be added separately)
- Just write the body of the reply

The reply should be ready to send with minimal editing.`
        },
        {
          role: 'user',
          content: `Generate a professional reply to this email:

From: ${fromName} <${fromEmail}>
Subject: ${subject}

${bodyText}

${context ? `\n\nAdditional context: ${context}` : ''}`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const replyText = completion.choices[0]?.message?.content?.trim() || '';

    // Track AI cost
    await trackAICost({
      userId,
      feature: 'generate-reply',
      model: 'gpt-3.5-turbo',
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    });

    console.log(`✅ Reply generated for ${emailId}`);

    return NextResponse.json({
      emailId,
      reply: replyText,
      tokens: completion.usage?.total_tokens || 0,
    });

  } catch (error: any) {
    console.error('❌ AI reply generation error:', error);

    return NextResponse.json({
      error: 'Failed to generate reply',
      details: error.message,
    }, { status: 500 });
  }
}
