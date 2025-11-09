/**
 * AI Email Summary API
 * POST /api/ai/summarize
 * Generates a concise summary of an email using OpenAI
 * SAVES TO DATABASE for permanent caching
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/db/drizzle';
import { emails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { trackAICost } from '@/lib/utils/cost-tracking';
import { aiRateLimit, enforceRateLimit } from '@/lib/security/rate-limiter';
import { checkAILimit } from '@/lib/billing/plan-limits';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory cache for v3 messages (session-based)
const summaryCache = new Map<string, { summary: string; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface SummaryRequest {
  emailId: string;
  subject?: string;
  snippet?: string;
  fromName?: string;
  bodyText?: string;
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

    const { emailId, subject, snippet, fromName, bodyText }: SummaryRequest = await request.json();

    // Log the request for debugging
    console.log('📨 Summarize request:', { emailId, hasSubject: !!subject, hasSnippet: !!snippet, hasBody: !!bodyText });

    // Validate input - need at least emailId and some content
    if (!emailId) {
      console.error('❌ Missing emailId');
      return NextResponse.json(
        { error: 'Missing emailId' },
        { status: 400 }
      );
    }

    // 🔥 CHECK IN-MEMORY CACHE FIRST (for v3 messages)
    const cached = summaryCache.get(emailId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ Using in-memory cached summary for ${emailId}`);
      return NextResponse.json({
        emailId,
        summary: cached.summary,
        cached: true,
        tokens: 0,
      });
    }

    // 🔥 CHECK DATABASE (for v1 messages)
    try {
      const existingEmail = await db.query.emails.findFirst({
        where: eq(emails.id, emailId),
        columns: { aiSummary: true },
      });

      if (existingEmail?.aiSummary) {
        console.log(`✅ Using database cached summary for ${emailId}`);
        // Also cache in memory for faster access
        summaryCache.set(emailId, { summary: existingEmail.aiSummary, timestamp: Date.now() });
        return NextResponse.json({
          emailId,
          summary: existingEmail.aiSummary,
          cached: true,
          tokens: 0,
        });
      }
    } catch (dbError) {
      // Email not in DB (v3 on-demand) - continue with generation
      console.log(`📧 Email ${emailId} not in database, will generate fresh summary`);
    }

    // Use snippet, bodyText, or subject as content (in order of preference)
    const content = snippet || bodyText?.substring(0, 1000) || subject || '';
    
    if (!content) {
      console.warn('⚠️ No content available for email:', emailId);
      return NextResponse.json({
        emailId,
        summary: '(No content available)',
        cached: false,
      });
    }

    // Check if OpenAI key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not configured, returning snippet as summary');
      return NextResponse.json({
        emailId,
        summary: content,
        keyPoints: [],
        cached: false,
      });
    }
    
    console.log(`🤖 Generating NEW AI summary for email: ${emailId}`);

    // Generate summary using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a helpful personal assistant summarizing emails for your boss.
          
Rules:
- Write like you're talking to a friend - casual and natural
- ONE sentence only (max 20 words)
- Use simple, plain English (no corporate jargon)
- Focus on what matters: WHO wants WHAT
- Be conversational and friendly

Examples:
- "Roger wants to know if you want seafood tonight?"
- "Sarah needs you to approve the Q4 budget by Friday"
- "Your doctor appointment is confirmed for Thursday at 3pm"
- "John sent the report you asked for, it's attached"
- "Netflix subscription payment of $15.99 went through"
- "Server maintenance tonight 11pm-2am, nothing you need to do"
- "Mom sent photos from the wedding"

BAD Examples (too formal):
- "Approval required for Q4 financial budget allocation" ❌
- "Payment confirmation: Invoice #1234 processed" ❌
- "Meeting invitation: Q4 Planning Discussion" ❌`
        },
        {
          role: 'user',
          content: `Summarize this email like you're my assistant telling me about it:

From: ${fromName || 'Unknown'}
Subject: ${subject}

${content}`
        }
      ],
      temperature: 0.5,
      max_tokens: 60,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || snippet || 'No summary available';

    // Track AI cost
    await trackAICost({
      userId,
      feature: 'summarize',
      model: 'gpt-3.5-turbo',
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
    });

    // 🔥 SAVE TO IN-MEMORY CACHE (for v3 messages)
    summaryCache.set(emailId, { summary, timestamp: Date.now() });
    console.log(`💾 Summary cached in memory for ${emailId}`);

    // 🔥 TRY TO SAVE TO DATABASE (for v1 messages)
    try {
      await db.update(emails)
        .set({
          aiSummary: summary,
          updatedAt: new Date(),
        })
        .where(eq(emails.id, emailId));

      console.log(`💾 Summary also saved to database for ${emailId}`);
    } catch (dbError) {
      // Not in DB (v3 message) - that's fine, in-memory cache works
      console.log(`ℹ️ Email ${emailId} not saved to database (likely v3 message)`);
    }

    console.log(`✅ Summary generated for ${emailId}: "${summary}"`);

    return NextResponse.json({
      emailId,
      summary,
      cached: false, // First generation
      tokens: completion.usage?.total_tokens || 0,
    });

  } catch (error: any) {
    console.error('❌ AI summary error:', error);

    // Fallback to snippet on error
    const { snippet, emailId } = await request.json();
    
    return NextResponse.json({
      emailId,
      summary: snippet || 'Failed to generate summary',
      error: error.message,
      cached: false,
    });
  }
}

